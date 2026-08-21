import type {
  ProfileResponse,
  UpdateProfileRequest,
} from "@/api/generated/schemas";
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

/**
 * Удаление своего аккаунта (App Store 5.1.1(v) / Play Data safety).
 *
 * Тип запроса не сгенерирован из OpenAPI: ручка `DELETE /profile` появляется
 * на бэкенде вместе с этим фронтом и ещё не задеплоена, когда пишется этот
 * код. После деплоя backend и прогона `npm run generate:api` эту ручную
 * сигнатуру стоит заменить на сгенерированный тип, если он появится.
 */
export function deleteAccount(password: string) {
  return apiRequest<void>({
    method: "DELETE",
    path: "/profile",
    body: { password },
  });
}
