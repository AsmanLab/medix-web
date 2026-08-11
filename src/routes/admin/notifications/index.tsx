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
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { parseDeepLink } from "@/features/notifications/deep-link";
import { PushToggle } from "@/features/profile/PushToggle";
import { requireStaffPanel } from "@/session/guards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/notifications/")({
  beforeLoad: () =>
    requireStaffPanel({ roles: ["admin", "manager", "service_engineer"] }),
  component: AdminNotificationsPage,
});

/**
 * Ведёт в карточку внутри админки.
 *
 * Тот же запрос у клиента и у менеджера открывается в разных местах, поэтому
 * служебные ссылки приходят с префиксом `admin/` и разбираются отдельно от
 * клиентских — см. parseDeepLink.
 */
async function openDeepLink(
  navigate: ReturnType<typeof useNavigate>,
  path: string | null,
) {
  const target = parseDeepLink(path);
  if (!target) return;

  switch (target.kind) {
    case "admin-rfq":
      await navigate({
        to: "/admin/commerce/$rfqId",
        params: { rfqId: target.id },
      });
      return;
    case "admin-service":
      await navigate({
        to: "/admin/service-desk/$requestId",
        params: { requestId: target.id },
      });
      return;
    case "admin-customer":
      await navigate({
        to: "/admin/users/$customerId",
        params: { customerId: target.id },
      });
      return;
    case "order":
      await navigate({
        to: "/admin/orders/$orderId",
        params: { orderId: target.id },
      });
      return;
    default:
      // Клиентские адреса сотруднику открывать некуда: своих заказов
      // и запросов у него нет. Уведомление просто отмечается прочитанным.
      return;
  }
}

function AdminNotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: ({ signal }) => listNotifications(signal),
    refetchInterval: 60_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

  const readOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => void invalidate(),
  });

  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: async () => {
      toast.success("Все прочитаны");
      await invalidate();
    },
    onError: (err: unknown) =>
      toast.error(isAppError(err) ? err.message : "Не удалось обновить"),
  });

  const items = listQuery.data?.notifications ?? [];
  const unread = listQuery.data?.unread_count ?? 0;

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Уведомления</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {unread > 0
              ? `Непрочитанных: ${unread}`
              : "Новые запросы, согласия по КП, заявки на верификацию и сервис"}
          </p>
        </div>
        {unread > 0 ? (
          <Button
            variant="outline"
            disabled={readAll.isPending}
            onClick={() => readAll.mutate()}
          >
            <CheckCheck className="h-4 w-4" aria-hidden />
            Прочитать все
          </Button>
        ) : null}
      </header>

      {/* Уведомления в браузере приходят, даже когда вкладка закрыта, —
          для работы по очереди это важнее, чем клиенту. */}
      <div className="mt-6">
        <PushToggle />
      </div>

      <div className="mt-6">
        <StateBlock
          isLoading={listQuery.isLoading}
          isError={listQuery.isError}
          error={listQuery.error}
          onRetry={() => void listQuery.refetch()}
          isEmpty={listQuery.isSuccess && items.length === 0}
          emptyIcon={Bell}
          emptyTitle="Пока нет уведомлений"
          emptyDescription="Здесь появятся новые запросы КП, согласия клиентов, заявки на верификацию и сервисные заявки."
        >
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
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
    </div>
  );
}
