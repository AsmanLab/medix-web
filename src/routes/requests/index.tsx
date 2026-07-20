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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/requests/")({
  component: RequestsListPage,
});

function RequestsListPage() {
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
      <h1 className="font-display text-3xl font-bold">Мои заявки</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Запросы цены (RFQ) и коммерческие предложения
      </p>
      <CommerceTabs active="requests" />

      <div className="mt-8">
        <StateBlock
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={query.isSuccess && items.length === 0}
          onRetry={() => void query.refetch()}
          emptyTitle="Заявок пока нет"
          emptyDescription="Добавьте товары в корзину и отправьте запрос на расчёт."
          emptyFallback={
            <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <FileText className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 font-semibold">Заявок пока нет</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Добавьте товары в корзину и отправьте запрос на расчёт.
              </p>
              <Link
                to="/catalog"
                search={{ q: undefined }}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
              >
                В каталог <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
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
                      {rfqStatusLabel(rfq.status)}
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
