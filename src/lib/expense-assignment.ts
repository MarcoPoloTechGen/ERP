import type { Project, ProjectBuilding } from "@/lib/erp";

export type ExpenseAssignmentKey = `project:${number}` | `building:${number}` | `building:${number}:${number}`;

export type ExpenseAssignment = {
  projectId: number | null;
  buildingId: number | null;
};

export type ExpenseAssignmentOptionGroup = {
  label: string;
  options: Array<{
    label: string;
    value: ExpenseAssignmentKey;
  }>;
};

const PROJECT_ASSIGNMENT_PREFIX = "project:";
const BUILDING_ASSIGNMENT_PREFIX = "building:";

export function projectExpenseAssignmentKey(projectId: number | null | undefined) {
  return projectId == null ? undefined : (`${PROJECT_ASSIGNMENT_PREFIX}${projectId}` as ExpenseAssignmentKey);
}

export function buildingExpenseAssignmentKey(
  buildingId: number | null | undefined,
  projectId?: number | null,
) {
  if (buildingId == null) {
    return undefined;
  }

  return projectId == null
    ? (`${BUILDING_ASSIGNMENT_PREFIX}${buildingId}` as ExpenseAssignmentKey)
    : (`${BUILDING_ASSIGNMENT_PREFIX}${projectId}:${buildingId}` as ExpenseAssignmentKey);
}

export function expenseAssignmentKeyFromRecord(projectId: number | null | undefined, buildingId: number | null | undefined) {
  return buildingExpenseAssignmentKey(buildingId, projectId) ?? projectExpenseAssignmentKey(projectId);
}

export function parseExpenseAssignmentKey(
  value: string | null | undefined,
  buildings: ProjectBuilding[] = [],
): ExpenseAssignment {
  if (!value) {
    return { projectId: null, buildingId: null };
  }

  if (value.startsWith(PROJECT_ASSIGNMENT_PREFIX)) {
    const projectId = Number(value.slice(PROJECT_ASSIGNMENT_PREFIX.length));
    return Number.isFinite(projectId) ? { projectId, buildingId: null } : { projectId: null, buildingId: null };
  }

  if (value.startsWith(BUILDING_ASSIGNMENT_PREFIX)) {
    const parts = value.slice(BUILDING_ASSIGNMENT_PREFIX.length).split(":").map(Number);
    const projectId = parts.length > 1 ? parts[0] : null;
    const buildingId = parts.length > 1 ? parts[1] : parts[0];
    if (!Number.isFinite(buildingId) || (projectId != null && !Number.isFinite(projectId))) {
      return { projectId: null, buildingId: null };
    }

    return {
      projectId: projectId ?? buildings.find((building) => building.id === buildingId)?.projectId ?? null,
      buildingId,
    };
  }

  return { projectId: null, buildingId: null };
}

export function buildExpenseAssignmentOptions({
  projects = [],
  buildings = [],
  projectWideLabel,
}: {
  projects?: Project[];
  buildings?: ProjectBuilding[];
  projectWideLabel: string;
}): ExpenseAssignmentOptionGroup[] {
  const buildingsByProject = new Map<number, ProjectBuilding[]>();

  for (const building of buildings) {
    const projectBuildings = buildingsByProject.get(building.projectId) ?? [];
    projectBuildings.push(building);
    buildingsByProject.set(building.projectId, projectBuildings);
  }

  return projects.map((project) => ({
    label: project.name,
    options: [
      { label: `${project.name} - ${projectWideLabel}`, value: projectExpenseAssignmentKey(project.id) },
      ...(buildingsByProject.get(project.id) ?? []).map((building) => ({
        label: `${project.name} - ${building.name}`,
        value: buildingExpenseAssignmentKey(building.id, building.projectId),
      })),
    ].filter((option): option is { label: string; value: ExpenseAssignmentKey } => Boolean(option.value)),
  }));
}
