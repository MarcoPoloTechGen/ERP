import type { UserRole } from "@/lib/erp";

export function isSuperAdmin(role: UserRole | null | undefined) {
  return role === "super_admin";
}

export function hasAdminAccess(role: UserRole | null | undefined) {
  return role === "super_admin" || role === "admin";
}

export function canDeleteProjects(role: UserRole | null | undefined) {
  return isSuperAdmin(role);
}
