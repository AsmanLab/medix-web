import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { isAppError } from "@/api/errors";
import {
  downloadManagerInvoice,
  publishManagerInvoice,
} from "@/api/manager-invoice";
import {
  fetchManagerInvoiceByOrder,
  fetchManagerOrder,
  updateManagerOrderStatus,
} from "@/api/manager-orders";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import {
  nextOrderStatuses,
  orderSourceLabel,
  orderStatusLabel,
  orderStatusTone,
} from "@/features/orders/status";
import { formatRfqDate } from "@/features/rfq/status";
import { requireStaffPanel } from "@/session/guards";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/orders/$orderId")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin", "manager"] }),
  component: ManagerOrderDetailPage,
});

function ManagerOrderDetailPage() {
  const { orderId } = Route.useParams();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const detailQuery = useQuery({
    queryKey: queryKeys.managerOrders.detail(orderId),
    queryFn: ({ signal }) => fetchManagerOrder(orderId, signal),
  });

  const invoiceQuery = useQuery({
    queryKey: queryKeys.managerOrders.invoice(orderId),
    queryFn: async ({ signal }) => {
      try {
        return await fetchManagerInvoiceByOrder(orderId, signal);
      } catch (err) {
        if (isAppError(err) && err.status === 404) return null;
        throw err;
      }
    },
    enabled: !!detailQuery.data,
    retry: false,
  });

  const order = detailQuery.data;
  const invoice = invoiceQuery.data;
  const tone = order ? orderStatusTone(order.status) : "muted";
  const allowedNext = order ? nextOrderStatuses(order.status) : [];

  const canPublishInvoice = !!invoice && invoice.status === "draft";
  const canDownloadInvoice =
    !!invoice &&
    (invoice.status === "published" || !!invoice.pdf_key || !!invoice.pdf_url);

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      updateManagerOrderStatus(orderId, { status, comment: comment.trim() }),
    onSuccess: async (res) => {
      toast.success(`Статус: ${orderStatusLabel(res.status)}`);
      setComment("");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.managerOrders.all,
      });
    },
    onError: (err) => {
      toast.error(
        isAppError(err) ? err.message : "Не удалось изменить статус заказа",
      );
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => {
      if (!invoice) throw new Error("Счёт не найден");
      return publishManagerInvoice(invoice.id);
    },
    onSuccess: async () => {
      toast.success("Счёт опубликован. PDF появится примерно через минуту.");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.managerOrders.invoice(orderId),
      });
    },
    onError: (err) => {
      toast.error(
        isAppError(err) ? err.message : "Не удалось опубликовать счёт",
      );
    },
  });

  async function onDownloadInvoice() {
    if (!invoice) return;
    try {
      const res = await downloadManagerInvoice(invoice.id);
      window.open(res.download_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      if (invoice.pdf_url) {
        window.open(invoice.pdf_url, "_blank", "noopener,noreferrer");
        return;
      }
      toast.error(
        isAppError(err)
          ? err.message
          : "PDF ещё не готов — подождите генерацию после публикации",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />К списку заказов
        </Link>
      </div>

      <StateBlock
        isLoading={detailQuery.isLoading}
        isError={detailQuery.isError}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        loadingVariant="detail"
      >
        {order ? (
          <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
                  <Package className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold">
                    Заказ {order.id.slice(0, 8)}…
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {orderSourceLabel(order.source)} · клиент{" "}
                    {order.client_id.slice(0, 8)}… ·{" "}
                    {formatRfqDate(order.created_at)}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex rounded-lg px-3 py-1 text-xs font-bold uppercase",
                  tone === "success" && "bg-emerald-500/15 text-emerald-700",
                  tone === "primary" && "bg-primary-soft text-primary",
                  tone === "warning" && "bg-amber-500/15 text-amber-700",
                  tone === "danger" && "bg-red-500/15 text-red-700",
                  tone === "muted" && "bg-muted text-muted-foreground",
                )}
              >
                {orderStatusLabel(order.status)}
              </span>
            </header>

            {order.rfq_id ? (
              <Link
                to="/admin/commerce/$rfqId"
                params={{ rfqId: order.rfq_id }}
                className="inline-flex text-sm font-semibold text-primary"
              >
                Открыть исходный запрос КП →
              </Link>
            ) : null}

            <section className="rounded-3xl border border-border bg-card p-5">
              <h2 className="font-semibold">Состав заказа</h2>
              <ul className="mt-4 space-y-2">
                {order.items.map((item, i) => (
                  <li
                    key={`${item.sku}-${i}`}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2 text-sm last:border-0"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{item.name}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {item.sku}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {item.qty} × {formatMoney(item.price, "цена по запросу")}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm font-semibold">
                Итого: {formatMoney(order.total, "—")}
              </p>
            </section>

            <section className="space-y-4 rounded-3xl border border-border bg-card p-5">
              <h2 className="font-semibold">Статус доставки</h2>
              {allowedNext.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Заказ в финальном статусе — дальнейшие переходы недоступны.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <label
                      htmlFor="status-comment"
                      className="block text-xs font-semibold"
                    >
                      Комментарий (необязательно)
                    </label>
                    <input
                      id="status-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="field-control"
                      placeholder="Передан в доставку…"
                      disabled={statusMutation.isPending}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allowedNext.map((next) => (
                      <Button
                        key={next}
                        type="button"
                        variant={next === "cancelled" ? "outline" : "primary"}
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate(next)}
                      >
                        {orderStatusLabel(next)}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="space-y-3 rounded-3xl border border-border bg-card p-5">
              <h2 className="font-semibold">Счёт</h2>
              {invoiceQuery.isError ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Не удалось загрузить счёт
                    {isAppError(invoiceQuery.error)
                      ? `: ${invoiceQuery.error.message}`
                      : "."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void invoiceQuery.refetch()}
                  >
                    Повторить
                  </Button>
                </>
              ) : !invoice ? (
                <p className="text-sm text-muted-foreground">
                  Счёта по этому заказу нет.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    <FileText className="mr-1 inline h-4 w-4" aria-hidden />
                    {invoice.id.slice(0, 8)}… ·{" "}
                    {invoice.status === "published"
                      ? "опубликован"
                      : "черновик"}{" "}
                    · {formatMoney(invoice.total, "—")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {canPublishInvoice ? (
                      <Button
                        type="button"
                        disabled={publishMutation.isPending}
                        onClick={() => publishMutation.mutate()}
                      >
                        {publishMutation.isPending
                          ? "Публикуем…"
                          : "Опубликовать счёт"}
                      </Button>
                    ) : null}
                    {canDownloadInvoice ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void onDownloadInvoice()}
                      >
                        <Download className="h-4 w-4" aria-hidden />
                        Скачать PDF
                      </Button>
                    ) : null}
                  </div>
                  {invoice.status === "published" && !canDownloadInvoice ? (
                    <p className="text-xs text-muted-foreground">
                      PDF генерируется фоновым воркером — обычно до минуты.
                    </p>
                  ) : null}
                </>
              )}
            </section>

            <section className="rounded-3xl border border-border bg-card p-5">
              <h2 className="font-semibold">История статусов</h2>
              {order.status_history.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Пока пусто.
                </p>
              ) : (
                <ol className="mt-4 space-y-2 text-sm">
                  {order.status_history
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(a.at).getTime() - new Date(b.at).getTime(),
                    )
                    .map((entry, i) => (
                      <li
                        key={`${entry.status}-${i}`}
                        className="flex items-baseline justify-between gap-3 border-b border-border pb-2 last:border-0"
                      >
                        <span>{orderStatusLabel(entry.status)}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatRfqDate(entry.at)}
                        </span>
                      </li>
                    ))}
                </ol>
              )}
            </section>
          </div>
        ) : null}
      </StateBlock>
    </div>
  );
}
