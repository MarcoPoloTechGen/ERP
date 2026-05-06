import { useQuery } from "@tanstack/react-query";
import { erpKeys, listProjectAlerts, listProjectBuildings, listProjectFiles, listProjects } from "@/lib/erp";

export function useProjects() {
  return useQuery({
    queryKey: erpKeys.projects,
    queryFn: listProjects,
  });
}

export function useProjectBuildings(projectId?: number | null, enabled = true) {
  return useQuery({
    queryKey: erpKeys.projectBuildings(projectId ?? 0),
    queryFn: () => listProjectBuildings(projectId ?? undefined),
    enabled,
  });
}

export function useProjectFiles(projectId?: number | null, enabled = true) {
  return useQuery({
    queryKey: erpKeys.projectFiles(projectId ?? 0),
    queryFn: () => listProjectFiles(projectId ?? 0),
    enabled: enabled && projectId != null,
  });
}

export function useProjectAlerts(projectId?: number | null, enabled = true) {
  return useQuery({
    queryKey: erpKeys.projectAlerts(projectId ?? 0),
    queryFn: () => listProjectAlerts(projectId ?? undefined),
    enabled: enabled && projectId != null,
  });
}
