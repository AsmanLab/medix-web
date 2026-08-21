import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { isAppError } from "@/api/errors";
import {
  acceptRfqQuote,
  downloadRfqInvoice,
  fetchRfq,
  fetchRfqInvoice,
  rejectRfqQuote,
} from "@/api/rfq";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import {
  buildRfqTimeline,
  formatRfqDate,
  rfqStatusLabel,
  rfqStatusTone,
  type TimelineStep,
} from "@/features/rfq/status";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status-pill";
import { useT } from "@/i18n/LocaleProvider";

export const Route = createFileRoute("/requests/$rfqId")({
  component: RequestDetailPage,
});

function RequestDetailPage() {
  const t = useT();
  const { rfqId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [acting, setActing] = useState<"accept" | "reject" | null>(null);

  const detailQuery = useQuery({
    queryKey: queryKeys.rfq.detail(rfqId),
    queryFn: ({ signal }) => fetchRfq(rfqId, signal),
    retry: (count, err: unknown) => {
      if (isAppError(err) && err.status === 404) return false;
      return count < 1;
    },
  });

  const invoiceQuery = useQuery({
    queryKey: queryKeys.rfq.invoice(rfqId),
    queryFn: async ({ signal }) => {
      try {
        return await fetchRfqInvoice(rfqId, signal);
      } catch (err) {
        if (isAppError(err) && err.status === 404) return null;
        throw err;
      }
    },
    enabled: !!detailQuery.data,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptRfqQuote(rfqId),
    onSuccess: async (result) => {
      toast.success(t("КП принято — заказ создан, организация подтверждена"));
      await queryClient.invalidateQueries({ queryKey: queryKeys.rfq.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      await navigate({
        to: "/orders/$orderId",
        params: { orderId: result.order_id },
      });
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : t("Не удалось принять КП"));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectRfqQuote(rfqId),
    onSuccess: async () => {
      toast.success(t("Котировка отклонена"));
      await queryClient.invalidateQueries({ queryKey: queryKeys.rfq.all });
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : t("Не удалось отклонить КП"));
    },
  });

  const rfq = detailQuery.data;
  const tone = rfq ? rfqStatusTone(rfq.status) : "muted";
  const timeline = rfq ? buildRfqTimeline(rfq.status, t) : [];
  const canDecide = rfq?.status === "quoted";
  const invoice = invoiceQuery.data;
  const invoicePublished =
    !!invoice &&
    (invoice.status === "published" || !!invoice.pdf_key || !!invoice.pdf_url);
  const invoicePdfPending =
    invoicePublished && !invoice?.pdf_key && !invoice?.pdf_url;

  async function onDownloadInvoice() {
    try {
      const res = await downloadRfqInvoice(rfqId);
      window.open(res.download_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(
        isAppError(err) ? err.message : t("Счёт пока недоступен для скачивания"),
      );
    }
  }

  async function onAccept() {
    setActing("accept");
    try {
      await acceptMutation.mutateAsync();
    } finally {
      setActing(null);
    }
  }

  async function onReject() {
    setActing("reject");
    try {
      await rejectMutation.mutateAsync();
    } finally {
      setActing(null);
    }
  }

  return (
    <AppShell>
      <Link
        to="/requests"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <ArrowLeft className="h-4 w-4" />{t("К заявкам")}
      </Link>

      <div className="mt-6">
        <StateBlock
          isLoading={detailQuery.isLoading}
          isError={detailQuery.isError}
          error={detailQuery.error}
          onRetry={() => void detailQuery.refetch()}
          loadingVariant="detail"
        >
          {rfq ? (
            <div className="space-y-6">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("Запрос на котировку")}
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-bold">RFQ</h1>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                    {rfq.id}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    от {formatRfqDate(rfq.created_at)}
                  </p>
                </div>
                <StatusPill tone={tone}>
                  {rfqStatusLabel(rfq.status, t)}
                </StatusPill>
              </header>

              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-semibold">{t("Статус")}</h2>
                <Timeline steps={timeline} />
              </section>

              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-semibold">Позиции · {rfq.items.length}</h2>
                <ul className="mt-3 divide-y divide-border">
                  {rfq.items.map((item) => (
                    <li
                      key={`${item.product_id}-${item.sku}-${item.option_type ?? ""}`}
                      className="flex items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Арт. {item.sku} · {item.qty} шт.
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-primary">
                        {formatMoney(item.unit_price, t("По запросу"))}
                      </p>
                    </li>
                  ))}
                </ul>
                {rfq.comment ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Комментарий: {rfq.comment}
                  </p>
                ) : null}
              </section>

              {rfq.quote ? (
                <section className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="font-semibold">{t("Коммерческое предложение")}</h2>
                  {rfq.quote.valid_until ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Действует до {formatRfqDate(rfq.quote.valid_until)}
                    </p>
                  ) : null}
                  <ul className="mt-3 divide-y divide-border">
                    {rfq.quote.items.map((item) => (
                      <li
                        key={`q-${item.product_id}-${item.sku}`}
                        className="flex items-start justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.qty} шт.
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold">
                          {formatMoney(item.unit_price, "—")}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm font-semibold">{t("Итого")}</span>
                    <span className="text-lg font-bold text-primary">
                      {formatMoney(rfq.quote.total, t("По запросу"))}
                    </span>
                  </div>
                  {rfq.quote.conditions ? (
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      {rfq.quote.conditions}
                    </p>
                  ) : null}

                  {canDecide ? (
                    <div className="mt-5 space-y-3">
                      <p className="text-xs leading-5 text-muted-foreground">
                        {t("Принятие КП создаёт заказ и подтверждает организацию.")}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          disabled={acting !== null}
                          onClick={() => void onAccept()}
                        >
                          {acting === "accept" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Принять КП
                        </Button>
                        <Button
                          variant="outline"
                          disabled={acting !== null}
                          onClick={() => void onReject()}
                        >
                          {acting === "reject" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Отклонить
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : (
                <section className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
                  Котировка ещё не опубликована. Менеджер подготовит КП после
                  обработки заявки.
                </section>
              )}

              {invoicePublished ? (
                <section className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="font-semibold">{t("Счёт")}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Статус: {invoice?.status}
                  </p>
                  {invoicePdfPending ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      {t("PDF готовится — обновите страницу через минуту.")}
                    </p>
                  ) : (
                    <Button
                      className="mt-4"
                      variant="outline"
                      onClick={() => void onDownloadInvoice()}
                    >
                      <Download className="h-4 w-4" />
                      {t("Скачать счёт")}
                    </Button>
                  )}
                </section>
              ) : null}
            </div>
          ) : null}
        </StateBlock>
      </div>
    </AppShell>
  );
}

function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="mt-4 space-y-3">
      {steps.map((step) => (
        <li key={step.key} className="flex items-start gap-3">
          {step.state === "done" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
          ) : step.state === "active" ? (
            <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-primary" />
          ) : (
            <Circle className="mt-0.5 h-4 w-4 text-muted-foreground/50" />
          )}
          <span
            className={cn(
              "text-sm",
              step.state === "pending"
                ? "text-muted-foreground"
                : "font-medium text-foreground",
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
