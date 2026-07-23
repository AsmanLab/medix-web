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
