import { apiRequest } from "@/api/client";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  deep_link: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationsList = {
  unread_count: number;
  notifications: NotificationItem[];
};

export function listNotifications(signal?: AbortSignal) {
  return apiRequest<NotificationsList>({
    path: "/notifications",
    signal,
  });
}

export function markNotificationRead(notificationId: string) {
  return apiRequest<void>({
    method: "POST",
    path: `/notifications/${encodeURIComponent(notificationId)}/read`,
  });
}

export function markAllNotificationsRead() {
  return apiRequest<void>({
    method: "POST",
    path: "/notifications/read-all",
  });
}

/**
 * Регистрирует устройство для push. Идемпотентна: повторный вызов с тем же
 * токеном не создаёт дубликат и не ошибается (Medix#79) — а для браузера
 * это норма, токен стабилен и присылается при каждом входе.
 */
export function registerDevice(input: {
  platform: "fcm" | "apns";
  token: string;
}) {
  return apiRequest<{ status: string }>({
    method: "POST",
    path: "/devices",
    body: input,
  });
}

export function removeDevice(token: string) {
  return apiRequest<void>({
    method: "DELETE",
    path: `/devices/${encodeURIComponent(token)}`,
  });
}
