import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { ServiceRequest } from "@/api/service-requests";
import { StateBlock } from "@/components/shared/StateBlock";
import {
  formatServiceDate,
  serviceStatusLabel,
  serviceStatusTone,
  shortRequestId,
  type ServiceStatus,
} from "@/features/service/status";
import { cn } from "@/lib/utils";

export type ServiceDeskTab = "new" | "in_progress" | "completed";

const TAB_STATUSES: Record<ServiceDeskTab, ServiceStatus[]> = {
  new: ["new", "accepted"],
  in_progress: ["assigned", "in_progress", "waiting_parts"],
  completed: ["completed", "closed"],
};

export function serviceDeskTabFor(status: string): ServiceDeskTab | null {
  if (TAB_STATUSES.new.includes(status)) return "new";
  if (TAB_STATUSES.in_progress.includes(status)) return "in_progress";
  if (TAB_STATUSES.completed.includes(status)) return "completed";
  return null;
}

type Props = {
  items: ServiceRequest[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  /** engineer → /engineer/$requestId ; admin → /admin/service-desk/$requestId */
  detailMode: "engineer" | "admin";
  emptyTitle?: string;
};

export function ServiceDeskQueue({
  items,
  isLoading,
  isError,
  error,
  onRetry,
  detailMode,
  emptyTitle = "Нет заявок в этой вкладке",
}: Props) {
  const [tab, setTab] = useState<ServiceDeskTab>("new");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => {
    let rows = items ?? [];
    const allowed = TAB_STATUSES[tab];
    rows = rows.filter((r) => allowed.includes(r.status));

    if (fromDate) {
      const from = new Date(`${fromDate}T00:00:00`);
      rows = rows.filter((r) => new Date(r.created_at) >= from);
    }
    if (toDate) {
      const to = new Date(`${toDate}T23:59:59`);
      rows = rows.filter((r) => new Date(r.created_at) <= to);
    }
    return rows;
  }, [items, tab, fromDate, toDate]);

  const counts = useMemo(() => {
    const all = items ?? [];
    return {
      new: all.filter((r) => TAB_STATUSES.new.includes(r.status)).length,
      in_progress: all.filter((r) =>
        TAB_STATUSES.in_progress.includes(r.status),
      ).length,
      completed: all.filter((r) =>
        TAB_STATUSES.completed.includes(r.status),
      ).length,
    };
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: "new" as const, label: "Новые", count: counts.new },
            {
              value: "in_progress" as const,
              label: "В работе",
              count: counts.in_progress,
            },
            {
              value: "completed" as const,
              label: "Завершённые",
              count: counts.completed,
            },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "h-9 rounded-lg px-3 text-xs font-semibold",
              tab === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-secondary",
            )}
          >
            {t.label}
            <span className="ml-1.5 opacity-70">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-muted-foreground">
          С даты
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1.5 flex h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          По дату
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1.5 flex h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        {fromDate || toDate ? (
          <button
            type="button"
            className="h-10 text-xs font-semibold text-primary"
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
          >
            Сбросить даты
          </button>
        ) : null}
      </div>

      <StateBlock
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={onRetry}
        isEmpty={!isLoading && filtered.length === 0}
        emptyTitle={emptyTitle}
        emptyDescription="Смените вкладку или период"
      >
        <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
          {filtered.map((sr) => {
            const tone = serviceStatusTone(sr.status);
            return (
              <li key={sr.id}>
                <Link
                  to={
                    detailMode === "engineer"
                      ? "/engineer/$requestId"
                      : "/admin/service-desk/$requestId"
                  }
                  params={{ requestId: sr.id }}
                  className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 transition hover:bg-secondary/40"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">
                        {sr.equipment_type || "Оборудование"}
                        {sr.model ? ` · ${sr.model}` : ""}
                      </span>
                      <span
                        className={cn(
                          "rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase",
                          tone === "success" &&
                            "bg-emerald-500/15 text-emerald-700",
                          tone === "primary" && "bg-primary-soft text-primary",
                          tone === "warning" &&
                            "bg-amber-500/15 text-amber-700",
                          tone === "danger" && "bg-red-500/15 text-red-700",
                          tone === "muted" &&
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {serviceStatusLabel(sr.status)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {sr.contact_name?.trim() || "Клиент"}
                      {sr.contact_phone
                        ? ` · ${sr.contact_phone}`
                        : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {sr.address?.trim() || "Адрес не указан"}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {shortRequestId(sr.id)} · {formatServiceDate(sr.created_at)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">
                    Открыть →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </StateBlock>
    </div>
  );
}
