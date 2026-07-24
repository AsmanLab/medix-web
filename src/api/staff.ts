import { apiRequest } from "@/api/client";

export type StaffRole = "manager" | "service_engineer" | "admin";

export type StaffUser = {
  id: string;
  phone: string;
  role: StaffRole | string;
  is_active: boolean;
  created_at: string;
};

export type CreateStaffBody = {
  phone: string;
  password: string;
  role: StaffRole;
};

export function listStaffUsers(
  includeInactive = false,
  signal?: AbortSignal,
): Promise<StaffUser[]> {
  return apiRequest<StaffUser[]>({
    path: "/admin/users",
    query: { include_inactive: includeInactive || undefined },
    signal,
  });
}

export function createStaffUser(body: CreateStaffBody): Promise<StaffUser> {
  return apiRequest<StaffUser>({
    method: "POST",
    path: "/admin/users",
    body,
  });
}

export function deactivateStaffUser(
  userId: string,
): Promise<{ id: string; is_active: boolean }> {
  return apiRequest<{ id: string; is_active: boolean }>({
    method: "PATCH",
    path: `/admin/users/${encodeURIComponent(userId)}/deactivate`,
  });
}
