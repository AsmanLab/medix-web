import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Package } from "lucide-react";
import { listOrders } from "@/api/orders";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { CommerceTabs } from "@/components/shared/CommerceTabs";
import { StateBlock } from "@/components/shared/StateBlock";
import {
  orderSourceLabel,
  orderStatusLabel,
  orderStatusTone,
} from "@/features/orders/status";
import { formatRfqDate } from "@/features/rfq/status";
import { StatusPill } from "@/components/ui/status-pill";
import { usePageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/orders/")({
  component: OrdersListPage,
});

function OrdersListPage() {
  usePageMeta({ title: "Мои заказы", description: null });

  const query = useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: ({ signal }) => listOrders(signal),
  });

  const items = (query.data ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">Мои заказы</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Статусы, позиции и счета после оформления
      </p>
      <CommerceTabs active="orders" />

      <div className="mt-8">
        <StateBlock
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={query.isSuccess && items.length === 0}
          onRetry={() => void query.refetch()}
          loadingVariant="list"
          emptyIcon={Package}
          emptyTitle="Заказов пока нет"
          emptyDescription="После принятия КП заказ создаётся автоматически. Либо оформите прямой заказ из корзины, если организация подтверждена и у позиций есть цены."
          emptyAction={
            <Link
              to="/catalog"
              search={{ q: undefined }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
            >
              В каталог <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          <ul className="space-y-3">
            {items.map((order) => {
              const tone = orderStatusTone(order.status);
              return (
                <li key={order.id}>
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Заказ · {orderSourceLabel(order.source)}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-sm font-semibold">
                        {order.id}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatRfqDate(order.created_at)} · {order.items_count}{" "}
                        поз.
                      </p>
                    </div>
                    <StatusPill tone={tone}>
                      {orderStatusLabel(order.status)}
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
