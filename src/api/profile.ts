import type {
  ProfileResponse,
  UpdateProfileRequest,
} from "@/api/generated/openapi";
import { apiRequest } from "@/api/client";

export type { ProfileResponse };

export function fetchProfile(signal?: AbortSignal) {
  return apiRequest<ProfileResponse>({
    path: "/profile",
    signal,
  });
}

export function updateProfile(body: UpdateProfileRequest) {
  return apiRequest<ProfileResponse>({
    method: "PATCH",
    path: "/profile",
    body,
  });
}
