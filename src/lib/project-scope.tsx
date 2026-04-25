import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpKeys, listProjects, updateMySelectedProjectId, type Project } from "@/lib/erp";
import { useAuth } from "@/lib/auth";

type ProjectScopeContextValue = {
  projects: Project[];
  selectedProjectId: number | null;
  forcedProjectId: number | null;
  loading: boolean;
  setSelectedProjectId: (projectId: number | null) => void;
};

const ProjectScopeContext = createContext<ProjectScopeContextValue>({
  projects: [],
  selectedProjectId: null,
  forcedProjectId: null,
  loading: false,
  setSelectedProjectId: () => {},
});

export function ProjectScopeProvider({ children }: { children: React.ReactNode }) {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectIdState] = useState<number | null>(
    profile?.selectedProjectId ?? null,
  );
  const projectsQuery = useQuery({ queryKey: erpKeys.projects, queryFn: listProjects });
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  const persistMutation = useMutation({
    mutationFn: updateMySelectedProjectId,
    onSuccess: async () => {
      await Promise.all([
        refreshProfile(),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: erpKeys.invoices }),
        queryClient.invalidateQueries({ queryKey: erpKeys.incomes }),
        queryClient.invalidateQueries({ queryKey: erpKeys.products }),
      ]);
    },
  });

  useEffect(() => {
    setSelectedProjectIdState(profile?.selectedProjectId ?? null);
  }, [profile?.id, profile?.selectedProjectId]);

  useEffect(() => {
    if (!profile || projectsQuery.isLoading) {
      return;
    }

    const defaultProjectId = projects.length === 1 ? projects[0].id : null;
    const profileProjectId = profile.selectedProjectId;
    const profileProjectIsAllowed =
      profileProjectId == null || projects.some((project) => project.id === profileProjectId);
    const nextProjectId = profileProjectIsAllowed ? profileProjectId : defaultProjectId;

    if (selectedProjectId !== nextProjectId) {
      setSelectedProjectIdState(nextProjectId);
    }

    if (profileProjectId !== nextProjectId) {
      persistMutation.mutate(nextProjectId);
    }
  }, [profile, projects, projectsQuery.isLoading, selectedProjectId, persistMutation]);

  const value = useMemo<ProjectScopeContextValue>(
    () => ({
      projects,
      selectedProjectId,
      forcedProjectId: projects.length === 1 ? projects[0].id : null,
      loading: projectsQuery.isLoading || persistMutation.isPending,
      setSelectedProjectId: (projectId) => {
        if (projects.length === 1) {
          setSelectedProjectIdState(projects[0].id);
          return;
        }

        setSelectedProjectIdState(projectId);
        persistMutation.mutate(projectId);
      },
    }),
    [persistMutation, projects, projectsQuery.isLoading, selectedProjectId],
  );

  return <ProjectScopeContext.Provider value={value}>{children}</ProjectScopeContext.Provider>;
}

export function useProjectScope() {
  return useContext(ProjectScopeContext);
}
