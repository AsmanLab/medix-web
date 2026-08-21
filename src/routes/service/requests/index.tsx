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
import { StatusPill } from "@/components/ui/status-pill";
import { useT } from "@/i18n/LocaleProvider";

export const Route = createFileRoute("/service/requests/")({
  component: ServiceRequestsListPage,
});

function ServiceRequestsListPage() {
  const t = useT();
  const query = useQuery({
    queryKey: queryKeys.service.list(),
    queryFn: ({ signal }) => listServiceRequests(signal),
  });

  const items = (query.data ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("Сервисные заявки")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("История вызовов инженера и статусы работ")}
          </p>
        </div>
        <Link
          to="/service"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          {t("Новая заявка")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-8">
        <StateBlock
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={query.isSuccess && items.length === 0}
          onRetry={() => void query.refetch()}
          loadingVariant="list"
          emptyIcon={Wrench}
          emptyTitle={t("Сервисных заявок пока нет")}
          emptyDescription={t("Опишите оборудование и проблему — мы примем заявку в работу.")}
          emptyAction={
            <Link
              to="/service"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
            >
              {t("Создать заявку")} <ArrowRight className="h-4 w-4" />
            </Link>
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
                        {t("Заявка")}
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold">
                        {shortRequestId(item.id)}
                      </p>
                      <p className="mt-2 truncate text-sm font-medium">
                        {item.equipment_type || t("Оборудование")}
                        {item.model ? ` · ${item.model}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatServiceDate(item.created_at)}
                      </p>
                    </div>
                    <StatusPill tone={tone}>
                      {serviceStatusLabel(item.status, t)}
                    </StatusPill>
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
