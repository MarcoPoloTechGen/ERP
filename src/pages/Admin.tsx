import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  erpKeys,
  listProfiles,
  listProjectMemberships,
  listProjects,
  replaceUserProjectMemberships,
  updateProfileRole,
} from "@/lib/erp";
import { useAuth } from "@/lib/auth";
import { Card, EmptyState, PageHeader } from "@/components/ui-kit";
import { useLang } from "@/lib/i18n";

const selectClassName =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function Admin() {
  const { t } = useLang();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: erpKeys.users,
    queryFn: listProfiles,
    enabled: profile?.role === "admin",
  });
  const { data: projects } = useQuery({
    queryKey: erpKeys.projects,
    queryFn: listProjects,
    enabled: profile?.role === "admin",
  });
  const { data: memberships } = useQuery({
    queryKey: erpKeys.projectMemberships,
    queryFn: listProjectMemberships,
    enabled: profile?.role === "admin",
  });

  const membershipMap = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const membership of memberships ?? []) {
      map.set(membership.userId, [...(map.get(membership.userId) ?? []), membership.projectId]);
    }
    return map;
  }, [memberships]);

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "user" }) => {
      await updateProfileRole(userId, role);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: erpKeys.users });
    },
  });

  const membershipMutation = useMutation({
    mutationFn: async ({ userId, projectIds }: { userId: string; projectIds: number[] }) => {
      await replaceUserProjectMemberships(userId, projectIds);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: erpKeys.projectMemberships });
    },
  });

  if (profile?.role !== "admin") {
    return <EmptyState title="Cette page est reservee aux administrateurs." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        subtitle="Gestion des roles et des acces projet"
      />

      {!profiles?.length ? (
        <EmptyState title="Aucun utilisateur" />
      ) : (
        <div className="space-y-3">
          {profiles.map((user) => {
            const allowedProjectIds = membershipMap.get(user.id) ?? [];

            return (
              <Card key={user.id} className="p-5">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-foreground">
                        {user.fullName ?? user.email ?? "Utilisateur"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{user.email ?? "-"}</p>
                    </div>

                    <div className="w-full max-w-xs">
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        {t.role ?? "Role"}
                      </label>
                      <select
                        className={selectClassName}
                        value={user.role}
                        onChange={(event) =>
                          roleMutation.mutate({
                            userId: user.id,
                            role: event.target.value as "admin" | "user",
                          })
                        }
                      >
                        <option value="admin">Admin</option>
                        <option value="user">Utilisateur</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Projets autorises
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {(projects ?? []).map((project) => {
                        const checked = user.role === "admin" ? true : allowedProjectIds.includes(project.id);
                        return (
                          <label
                            key={project.id}
                            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                              checked ? "border-primary/30 bg-primary/5" : "border-border bg-background"
                            } ${user.role === "admin" ? "opacity-70" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={user.role === "admin"}
                              onChange={(event) => {
                                const nextIds = event.target.checked
                                  ? [...allowedProjectIds, project.id]
                                  : allowedProjectIds.filter((currentId) => currentId !== project.id);
                                membershipMutation.mutate({
                                  userId: user.id,
                                  projectIds: Array.from(new Set(nextIds)),
                                });
                              }}
                            />
                            <span>{project.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
