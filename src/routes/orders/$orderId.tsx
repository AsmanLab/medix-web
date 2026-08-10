import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isAppError } from "@/api/errors";
import {
  downloadOrderInvoice,
  fetchOrder,
  fetchOrderInvoice,
} from "@/api/orders";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import {
  orderSourceLabel,
  orderStatusLabel,
  orderStatusTone,
} from "@/features/orders/status";
import { formatRfqDate } from "@/features/rfq/status";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status-pill";

export const Route = createFileRoute("/orders/$orderId")({
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();

  const detailQuery = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: ({ signal }) => fetchOrder(orderId, signal),
    retry: (count, err: unknown) => {
      if (isAppError(err) && err.status === 404) return false;
      return count < 1;
    },
  });

  const invoiceQuery = useQuery({
    queryKey: queryKeys.orders.invoice(orderId),
    queryFn: async ({ signal }) => {
      try {
        return await fetchOrderInvoice(orderId, signal);
      } catch (err) {
        if (isAppError(err) && err.status === 404) return null;
        throw err;
      }
    },
    enabled: !!detailQuery.data,
    retry: false,
  });

  const order = detailQuery.data;
  const tone = order ? orderStatusTone(order.status) : "muted";
  const invoice = invoiceQuery.data;
  const canDownloadInvoice =
    !!invoice &&
    (invoice.status === "published" || !!invoice.pdf_key || !!invoice.pdf_url);
  // Три разных состояния, которые раньше сливались в одну плашку «счёт появится
  // после публикации»: запрос упал, счёт ещё черновик, счёта вообще нет.
  const invoiceFailed = invoiceQuery.isError;
  const invoiceIsDraft = !!invoice && !canDownloadInvoice;

  const history = (order?.status_history ?? [])
    .slice()
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  async function onDownloadInvoice() {
    try {
      const res = await downloadOrderInvoice(orderId);
      window.open(res.download_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(
        isAppError(err) ? err.message : "Счёт пока недоступен для скачивания",
      );
    }
  }

  return (
    <AppShell>
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <ArrowLeft className="h-4 w-4" />К заказам
      </Link>

      <div className="mt-6">
        <StateBlock
          isLoading={detailQuery.isLoading}
          isError={detailQuery.isError}
          error={detailQuery.error}
          onRetry={() => void detailQuery.refetch()}
          loadingVariant="detail"
        >
          {order ? (
            <div className="space-y-6">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Заказ · {orderSourceLabel(order.source)}
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-bold">
                    Заказ
                  </h1>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                    {order.id}
                  </p>
                </div>
                <StatusPill tone={tone}>
                  {orderStatusLabel(order.status)}
                </StatusPill>
              </header>

              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-semibold">Статус</h2>
                {history.length > 0 ? (
                  <ol className="mt-4 space-y-3">
                    {history.map((entry, index) => {
                      const isLast = index === history.length - 1;
                      const isTerminal =
                        entry.status === "completed" ||
                        entry.status === "cancelled";
                      return (
                        <li
                          key={`${entry.status}-${entry.at}`}
                          className="flex items-start gap-3"
                        >
                          {!isLast || isTerminal ? (
                            <CheckCircle2
                              className={cn(
                                "mt-0.5 h-4 w-4 shrink-0",
                                entry.status === "cancelled"
                                  ? "text-red-600"
                                  : "text-success",
                              )}
                            />
                          ) : (
                            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
                          )}
                          <div>
                            <p
                              className={cn(
                                "text-sm",
                                isLast
                                  ? "font-medium text-foreground"
                                  : "text-foreground",
                              )}
                            >
                              {orderStatusLabel(entry.status)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatRfqDate(entry.at)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    История статусов пока пуста. Текущий статус:{" "}
                    {orderStatusLabel(order.status)}.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-semibold">
                  Позиции · {order.items.length}
                </h2>
                <ul className="mt-3 divide-y divide-border">
                  {order.items.map((item) => (
                    <li
                      key={`${item.sku}-${item.name}`}
                      className="flex items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Арт. {item.sku} · {item.qty} шт.
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-primary">
                        {formatMoney(item.price, "—")}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              {canDownloadInvoice ? (
                <section className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="font-semibold">Документы</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Счёт · {invoice?.status}
                  </p>
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={() => void onDownloadInvoice()}
                  >
                    <Download className="h-4 w-4" />
                    Скачать счёт (PDF)
                  </Button>
                </section>
              ) : invoiceFailed ? (
                <section className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm">
                  <p className="text-muted-foreground">
                    Не удалось загрузить счёт
                    {isAppError(invoiceQuery.error)
                      ? `: ${invoiceQuery.error.message}`
                      : "."}
                  </p>
                  <Button
                    className="mt-3"
                    variant="outline"
                    size="sm"
                    onClick={() => void invoiceQuery.refetch()}
                  >
                    Повторить
                  </Button>
                </section>
              ) : invoiceIsDraft ? (
                <section className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm">
                  <p className="text-muted-foreground">
                    Счёт готовится. PDF появляется в течение минуты после
                    публикации менеджером.
                  </p>
                  <Button
                    className="mt-3"
                    variant="outline"
                    size="sm"
                    onClick={() => void invoiceQuery.refetch()}
                  >
                    Обновить
                  </Button>
                </section>
              ) : (
                <section className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
                  Счёт появится здесь после публикации менеджером.
                </section>
              )}
            </div>
          ) : null}
        </StateBlock>
      </div>
    </AppShell>
  );
}
