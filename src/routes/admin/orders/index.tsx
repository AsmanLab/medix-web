import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { listManagerOrders } from "@/api/manager-orders";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import {
  orderSourceLabel,
  orderStatusLabel,
  orderStatusTone,
} from "@/features/orders/status";
import { formatRfqDate } from "@/features/rfq/status";
import { requireStaffPanel } from "@/session/guards";
import { useSession } from "@/session/store";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status-pill";

const STATUS_FILTERS = [
  "new",
  "confirmed",
  "processing",
  "shipped",
  "completed",
  "cancelled",
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

type OrdersTab = "all" | "mine";

type OrdersSearch = {
  tab?: OrdersTab;
  status?: StatusFilter;
  q?: string;
};

export const Route = createFileRoute("/admin/orders/")({
  validateSearch: (search: Record<string, unknown>): OrdersSearch => ({
    tab: search.tab === "mine" || search.tab === "all" ? search.tab : undefined,
    status: STATUS_FILTERS.includes(search.status as StatusFilter)
      ? (search.status as StatusFilter)
      : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  beforeLoad: () => requireStaffPanel({ roles: ["admin", "manager"] }),
  component: ManagerOrdersPage,
});

function ManagerOrdersPage() {
  const { tab: tabFromUrl, status, q: qFromUrl } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { user } = useSession();
  const [draftQ, setDraftQ] = useState(qFromUrl ?? "");

  const tab = tabFromUrl ?? "all";

  // Фильтр по статусу отдаём серверу — он умеет это сам; вкладка «мои» и поиск
  // остаются клиентскими, как в очереди RFQ.
  const listQuery = useQuery({
    queryKey: queryKeys.managerOrders.list({ status }),
    queryFn: ({ signal }) => listManagerOrders({ status }, signal),
  });

  const items = useMemo(() => {
    let rows = listQuery.data ?? [];
    const myId = user?.userId;

    if (tab === "mine" && myId) {
      rows = rows.filter((o) => o.manager_id === myId);
    }

    const needle = (qFromUrl ?? "").trim().toLocaleLowerCase("ru");
    if (needle) {
      rows = rows.filter((o) =>
        [o.id, o.client_id, o.status]
          .join(" ")
          .toLocaleLowerCase("ru")
          .includes(needle),
      );
    }

    return rows;
  }, [listQuery.data, tab, qFromUrl, user?.userId]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
            <Package className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Заказы</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Статусы доставки и публикация счетов
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: "all", label: "Все" },
            { value: "mine", label: "Мои" },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  tab: t.value === "all" ? undefined : t.value,
                }),
                replace: true,
              })
            }
            className={cn(
              "h-9 rounded-lg px-3 text-xs font-semibold",
              tab === t.value
                ? "bg-primary-soft text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({
              search: (prev) => ({ ...prev, q: draftQ.trim() || undefined }),
              replace: true,
            });
          }}
        >
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Поиск по ID / клиенту"
            aria-label="Поиск заказов"
            className="h-11 w-full rounded-xl border border-border bg-background pr-3 pl-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
        <select
          value={status ?? "all"}
          aria-label="Фильтр по статусу"
          onChange={(e) =>
            void navigate({
              search: (prev) => ({
                ...prev,
                status:
                  e.target.value === "all"
                    ? undefined
                    : (e.target.value as StatusFilter),
              }),
              replace: true,
            })
          }
          className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
        >
          <option value="all">Все статусы</option>
          {STATUS_FILTERS.map((value) => (
            <option key={value} value={value}>
              {orderStatusLabel(value)}
            </option>
          ))}
        </select>
      </div>

      <StateBlock
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        error={listQuery.error}
        onRetry={() => void listQuery.refetch()}
        isEmpty={!listQuery.isLoading && items.length === 0}
        loadingVariant="list"
        emptyIcon={Package}
        emptyTitle="Заказов нет"
        emptyDescription="Заказы появляются после прямого оформления клиентом или конвертации запроса КП."
      >
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="hidden grid-cols-[1fr_120px_110px_110px_140px] border-b border-border bg-muted/40 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Заказ</span>
            <span>Сумма</span>
            <span>Позиций</span>
            <span>Статус</span>
            <span>Дата</span>
          </div>
          {items.map((order) => {
            const tone = orderStatusTone(order.status);
            return (
              <Link
                key={order.id}
                to="/admin/orders/$orderId"
                params={{ orderId: order.id }}
                className="grid gap-1 border-b border-border px-4 py-3 last:border-0 hover:bg-muted/30 sm:grid-cols-[1fr_120px_110px_110px_140px] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs font-semibold">
                    {order.id.slice(0, 8)}…
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {orderSourceLabel(order.source)} · клиент{" "}
                    {order.client_id.slice(0, 8)}…
                  </div>
                </div>
                <span className="text-sm">{formatMoney(order.total, "—")}</span>
                <span className="text-sm">{order.items_count}</span>
                <StatusPill tone={tone} size="compact">
                  {orderStatusLabel(order.status)}
                </StatusPill>
                <span className="text-xs text-muted-foreground">
                  {formatRfqDate(order.created_at)}
                </span>
              </Link>
            );
          })}
        </div>
      </StateBlock>
    </div>
  );
}
