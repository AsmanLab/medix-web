import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText } from "lucide-react";
import { listRfqs } from "@/api/rfq";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { CommerceTabs } from "@/components/shared/CommerceTabs";
import { StateBlock } from "@/components/shared/StateBlock";
import {
  formatRfqDate,
  rfqStatusLabel,
  rfqStatusTone,
} from "@/features/rfq/status";
import { StatusPill } from "@/components/ui/status-pill";
import { usePageMeta } from "@/lib/page-meta";
import { useT } from "@/i18n/LocaleProvider";

export const Route = createFileRoute("/requests/")({
  component: RequestsListPage,
});

function RequestsListPage() {
  const t = useT();
  usePageMeta({ title: t("Запросы КП"), description: null });

  const query = useQuery({
    queryKey: queryKeys.rfq.list(),
    queryFn: ({ signal }) => listRfqs(signal),
  });

  const items = (query.data ?? [])
    .filter((r) => r.status !== "draft")
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">{t("Мои заявки")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("Запросы цены (RFQ) и коммерческие предложения")}
      </p>
      <CommerceTabs active="requests" />

      <div className="mt-8">
        <StateBlock
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={query.isSuccess && items.length === 0}
          onRetry={() => void query.refetch()}
          loadingVariant="list"
          emptyIcon={FileText}
          emptyTitle={t("Заявок пока нет")}
          emptyDescription={t("Соберите корзину и отправьте запрос на коммерческое предложение. Менеджер подготовит КП — после принятия появится заказ.")}
          emptyAction={
            <Link
              to="/catalog"
              search={{ q: undefined }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {t("В каталог")} <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          <ul className="space-y-3">
            {items.map((rfq) => {
              const tone = rfqStatusTone(rfq.status);
              return (
                <li key={rfq.id}>
                  <Link
                    to="/requests/$rfqId"
                    params={{ rfqId: rfq.id }}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        RFQ
                      </p>
                      <p className="mt-0.5 truncate font-mono text-sm font-semibold">
                        {rfq.id}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatRfqDate(rfq.created_at)} · {rfq.items_count} поз.
                      </p>
                    </div>
                    <StatusPill tone={tone}>
                      {rfqStatusLabel(rfq.status, t)}
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
