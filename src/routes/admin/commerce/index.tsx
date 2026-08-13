import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { listManagerRfqs } from "@/api/manager-rfq";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import {
  formatRfqDate,
  rfqStatusLabel,
  rfqStatusTone,
} from "@/features/rfq/status";
import { requireStaffPanel } from "@/session/guards";
import { useSession } from "@/session/store";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status-pill";

type QueueTab = "all" | "unassigned" | "mine";
// converted_to_order и rejected обязаны быть в списке: после accept-quote RFQ
// сразу становится converted_to_order, и без них сделка пропадала из очереди.
const STATUS_FILTERS = [
  "submitted",
  "in_review",
  "quoted",
  "accepted",
  "converted_to_order",
  "rejected",
] as const;
type StatusFilter = "all" | (typeof STATUS_FILTERS)[number];

const STATUS_FILTER_LABELS: Record<(typeof STATUS_FILTERS)[number], string> = {
  submitted: "Отправлен",
  in_review: "В работе",
  quoted: "Есть КП",
  accepted: "Принят",
  converted_to_order: "В заказе",
  rejected: "Отклонён",
};

type CommerceSearch = {
  tab?: QueueTab;
  status?: StatusFilter;
  q?: string;
};

export const Route = createFileRoute("/admin/commerce/")({
  validateSearch: (search: Record<string, unknown>): CommerceSearch => ({
    tab:
      search.tab === "unassigned" ||
      search.tab === "mine" ||
      search.tab === "all"
        ? search.tab
        : undefined,
    status: STATUS_FILTERS.includes(
      search.status as (typeof STATUS_FILTERS)[number],
    )
      ? (search.status as StatusFilter)
      : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  beforeLoad: () => requireStaffPanel({ roles: ["admin", "manager"] }),
  component: ManagerRfqQueuePage,
});

function ManagerRfqQueuePage() {
  const {
    tab: tabFromUrl,
    status: statusFromUrl,
    q: qFromUrl,
  } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { user } = useSession();
  const [draftQ, setDraftQ] = useState(qFromUrl ?? "");

  const tab = tabFromUrl ?? "all";
  const status = statusFromUrl ?? "all";

  const listQuery = useQuery({
    queryKey: queryKeys.managerRfq.list(),
    queryFn: ({ signal }) => listManagerRfqs(signal),
  });

  const items = useMemo(() => {
    let rows = listQuery.data ?? [];
    const myId = user?.userId;

    if (tab === "unassigned") {
      rows = rows.filter((r) => !r.manager_id);
    } else if (tab === "mine" && myId) {
      rows = rows.filter((r) => r.manager_id === myId);
    }

    if (status !== "all") {
      rows = rows.filter((r) => r.status === status);
    }

    const needle = (qFromUrl ?? "").trim().toLocaleLowerCase("ru");
    if (needle) {
      rows = rows.filter((r) =>
        [r.id, r.client_id, r.status]
          .join(" ")
          .toLocaleLowerCase("ru")
          .includes(needle),
      );
    }

    return rows;
  }, [listQuery.data, tab, status, qFromUrl, user?.userId]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
            <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Очередь RFQ</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Взять в работу, выставить КП, конвертировать в заказ
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: "all", label: "Все" },
            { value: "unassigned", label: "Свободные" },
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
          className="relative min-w-[200px] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({
              search: (prev) => ({
                ...prev,
                q: draftQ.trim() || undefined,
              }),
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
            className="h-11 w-full rounded-xl border border-border bg-background pr-3 pl-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
        <select
          value={status}
          onChange={(e) =>
            void navigate({
              search: (prev) => ({
                ...prev,
                status:
                  e.target.value === "all"
                    ? undefined
                    : (e.target.value as StatusFilter),
              }),
            })
          }
          className="field-control sm:w-auto"
        >
          <option value="all">Все статусы</option>
          {STATUS_FILTERS.map((value) => (
            <option key={value} value={value}>
              {STATUS_FILTER_LABELS[value]}
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
        emptyIcon={ClipboardList}
        emptyTitle="Очередь пуста"
        emptyDescription="Новые запросы появятся здесь после отправки клиентом."
      >
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="hidden grid-cols-[1fr_110px_100px_140px] border-b border-border bg-muted/40 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:grid">
            <span>RFQ</span>
            <span>Позиций</span>
            <span>Статус</span>
            <span>Дата</span>
          </div>
          {items.map((rfq) => {
            const tone = rfqStatusTone(rfq.status);
            return (
              <Link
                key={rfq.id}
                to="/admin/commerce/$rfqId"
                params={{ rfqId: rfq.id }}
                className="grid gap-1 border-b border-border px-4 py-3 last:border-0 hover:bg-muted/30 sm:grid-cols-[1fr_110px_100px_140px] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs font-semibold">
                    {rfq.id.slice(0, 8)}…
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {rfq.manager_id
                      ? rfq.manager_id === user?.userId
                        ? "Назначен вам"
                        : "Назначен"
                      : "Свободный"}{" "}
                    · клиент {rfq.client_id.slice(0, 8)}…
                  </div>
                </div>
                <span className="text-sm">{rfq.items_count}</span>
                <StatusPill tone={tone} size="compact">
                  {rfqStatusLabel(rfq.status)}
                </StatusPill>
                <span className="text-xs text-muted-foreground">
                  {formatRfqDate(rfq.created_at)}
                </span>
              </Link>
            );
          })}
        </div>
      </StateBlock>
    </div>
  );
}
