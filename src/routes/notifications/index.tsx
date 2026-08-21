import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { isAppError } from "@/api/errors";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/notifications";
import { queryKeys } from "@/api/query-keys";
import { openDeepLink } from "@/features/notifications/open-deep-link";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/session/guards";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/LocaleProvider";

export const Route = createFileRoute("/notifications/")({
  beforeLoad: () => requireAuth({ roles: ["client"] }),
  component: NotificationsPage,
});


function NotificationsPage() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: ({ signal }) => listNotifications(signal),
    refetchInterval: 60_000,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.all,
    });
  };

  const readOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => void invalidate(),
  });

  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: async () => {
      toast.success(t("Все прочитаны"));
      await invalidate();
    },
    onError: (err: unknown) => {
      toast.error(isAppError(err) ? err.message : t("Не удалось обновить"));
    },
  });

  const items = listQuery.data?.notifications ?? [];
  const unread = listQuery.data?.unread_count ?? 0;

  return (
    <AppShell>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("Уведомления")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {unread > 0
              ? t("Непрочитанных: {count}", { count: unread })
              : t("Здесь статусы заказов, счетов и сервиса")}
          </p>
        </div>
        {unread > 0 ? (
          <Button
            variant="outline"
            disabled={readAll.isPending}
            onClick={() => readAll.mutate()}
          >
            <CheckCheck className="h-4 w-4" aria-hidden />
            {t("Прочитать все")}
          </Button>
        ) : null}
      </header>

      <div className="mt-8">
        <StateBlock
          isLoading={listQuery.isLoading}
          isError={listQuery.isError}
          error={listQuery.error}
          onRetry={() => void listQuery.refetch()}
          isEmpty={listQuery.isSuccess && items.length === 0}
          emptyIcon={Bell}
          emptyTitle={t("Пока нет уведомлений")}
          emptyDescription={t("Когда менеджер отправит КП, опубликует счёт или обновит сервис — сообщение появится здесь.")}
        >
          <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col gap-1 px-5 py-4 text-left transition hover:bg-secondary/40",
                    !n.is_read && "bg-primary-soft/30",
                  )}
                  onClick={() => {
                    if (!n.is_read) readOne.mutate(n.id);
                    void openDeepLink(navigate, n.deep_link);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{n.title}</p>
                    {!n.is_read ? (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("ru-RU")}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </StateBlock>
      </div>
    </AppShell>
  );
}
