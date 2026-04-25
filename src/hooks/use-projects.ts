import { useQuery } from "@tanstack/react-query";
import { erpKeys, listProjectBuildings, listProjects } from "@/lib/erp";

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
