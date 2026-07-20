import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Wrench } from "lucide-react";
import { listServiceRequests } from "@/api/service-requests";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import {
  formatServiceDate,
  serviceStatusLabel,
  serviceStatusTone,
  shortRequestId,
} from "@/features/service/status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/service/requests/")({
  component: ServiceRequestsListPage,
});

function ServiceRequestsListPage() {
  const query = useQuery({
    queryKey: queryKeys.service.list(),
    queryFn: ({ signal }) => listServiceRequests(signal),
  });

  const items = (query.data ?? []).slice().sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Сервисные заявки</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            История вызовов инженера и статусы работ
          </p>
        </div>
        <Link
          to="/service"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          Новая заявка <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-8">
        <StateBlock
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={query.isSuccess && items.length === 0}
          onRetry={() => void query.refetch()}
          emptyTitle="Заявок пока нет"
          emptyDescription="Опишите проблему — инженер свяжется с вами."
          emptyFallback={
            <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <Wrench className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 font-semibold">Сервисных заявок пока нет</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Опишите оборудование и проблему — мы примем заявку в работу.
              </p>
              <Link
                to="/service"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
              >
                Создать заявку <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          }
        >
          <ul className="space-y-3">
            {items.map((item) => {
              const tone = serviceStatusTone(item.status);
              return (
                <li key={item.id}>
                  <Link
                    to="/service/requests/$requestId"
                    params={{ requestId: item.id }}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Заявка
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold">
                        {shortRequestId(item.id)}
                      </p>
                      <p className="mt-2 truncate text-sm font-medium">
                        {item.equipment_type || "Оборудование"}
                        {item.model ? ` · ${item.model}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatServiceDate(item.created_at)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        tone === "success" && "bg-emerald-100 text-emerald-800",
                        tone === "primary" && "bg-primary-soft text-primary",
                        tone === "danger" && "bg-red-100 text-red-800",
                        tone === "muted" && "bg-muted text-muted-foreground",
                        tone === "warning" && "bg-amber-100 text-amber-900",
                      )}
                    >
                      {serviceStatusLabel(item.status)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </StateBlock>
      </div>
    </AppShell>
  );
}
