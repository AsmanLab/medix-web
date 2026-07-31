import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listManagerCustomers } from "@/api/customers";
import { isAppError } from "@/api/errors";
import {
  downloadManagerInvoice,
  fetchManagerInvoiceByRfq,
  publishManagerInvoice,
} from "@/api/manager-invoice";
import {
  convertManagerRfq,
  fetchManagerRfq,
  publishManagerQuote,
  takeManagerRfq,
  type PublishQuoteItemInput,
} from "@/api/manager-rfq";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import {
  formatRfqDate,
  rfqStatusLabel,
  rfqStatusTone,
} from "@/features/rfq/status";
import { requireStaffPanel } from "@/session/guards";
import { useSession } from "@/session/store";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-1.5 flex h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const Route = createFileRoute("/admin/commerce/$rfqId")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin", "manager"] }),
  component: ManagerRfqDetailPage,
});

type QuoteLine = PublishQuoteItemInput & { key: string };

function ManagerRfqDetailPage() {
  const { rfqId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();

  const detailQuery = useQuery({
    queryKey: queryKeys.managerRfq.detail(rfqId),
    queryFn: ({ signal }) => fetchManagerRfq(rfqId, signal),
  });

  const customersQuery = useQuery({
    queryKey: queryKeys.adminCustomers.list(),
    queryFn: ({ signal }) => listManagerCustomers(null, signal),
  });

  const invoiceQuery = useQuery({
    queryKey: queryKeys.managerRfq.invoice(rfqId),
    queryFn: async ({ signal }) => {
      try {
        return await fetchManagerInvoiceByRfq(rfqId, signal);
      } catch (err) {
        if (isAppError(err) && err.status === 404) return null;
        throw err;
      }
    },
    enabled: !!detailQuery.data,
    retry: false,
  });

  const rfq = detailQuery.data;
  const customer = useMemo(() => {
    if (!rfq) return null;
    return (
      customersQuery.data?.find((c) => c.user_id === rfq.client_id) ?? null
    );
  }, [customersQuery.data, rfq]);

  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [conditions, setConditions] = useState("");
  const [validUntil, setValidUntil] = useState("");

  useEffect(() => {
    if (!rfq) return;
    const source = rfq.quote?.items?.length ? rfq.quote.items : rfq.items;
    setLines(
      source.map((item, index) => ({
        key: `${item.product_id}-${index}`,
        product_id: item.product_id,
        sku: item.sku,
        name: item.name,
        qty: item.qty,
        unit_price_amount: item.unit_price
          ? String(item.unit_price).replace(/[^\d.,-]/g, "").replace(",", ".")
          : "",
        option_type: item.option_type,
        parent_line_id: item.parent_line_id,
      })),
    );
    setConditions(rfq.quote?.conditions ?? "");
    setValidUntil(
      rfq.quote?.valid_until
        ? rfq.quote.valid_until.slice(0, 10)
        : "",
    );
  }, [rfq]);

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.managerRfq.all });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.managerRfq.detail(rfqId),
    });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.managerRfq.invoice(rfqId),
    });
  }

  const takeMutation = useMutation({
    mutationFn: () => takeManagerRfq(rfqId),
    onSuccess: async () => {
      toast.success("RFQ взят в работу");
      await invalidate();
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось взять RFQ");
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => {
      const items = lines.map(({ key: _k, ...rest }) => ({
        ...rest,
        unit_price_amount:
          rest.unit_price_amount && String(rest.unit_price_amount).trim()
            ? String(rest.unit_price_amount).trim()
            : null,
      }));
      if (items.some((i) => !i.name.trim() || !i.sku.trim() || i.qty < 1)) {
        throw Object.assign(new Error("Проверьте позиции КП"), {
          status: 400,
          message: "Проверьте позиции КП",
        });
      }
      return publishManagerQuote(rfqId, {
        items,
        conditions: conditions.trim(),
        valid_until: validUntil
          ? new Date(`${validUntil}T23:59:59`).toISOString()
          : null,
      });
    },
    onSuccess: async () => {
      toast.success("КП отправлено клиенту");
      await invalidate();
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось отправить КП");
    },
  });

  const convertMutation = useMutation({
    mutationFn: () => convertManagerRfq(rfqId),
    onSuccess: async (res) => {
      toast.success(`Создан заказ ${res.order_id.slice(0, 8)}…`);
      await invalidate();
      await navigate({ to: "/admin/commerce" });
    },
    onError: (err) => {
      toast.error(
        isAppError(err) ? err.message : "Не удалось конвертировать в заказ",
      );
    },
  });

  const publishInvoiceMutation = useMutation({
    mutationFn: (invoiceId: string) => publishManagerInvoice(invoiceId),
    onSuccess: async () => {
      toast.success("Счёт опубликован для клиента");
      await invalidate();
    },
    onError: (err) => {
      toast.error(
        isAppError(err) ? err.message : "Не удалось опубликовать счёт",
      );
    },
  });

  const tone = rfq ? rfqStatusTone(rfq.status) : "muted";
  const isMine = !!rfq?.manager_id && rfq.manager_id === user?.userId;
  const canTake = rfq && !rfq.manager_id && rfq.status === "submitted";
  // Только in_review: из quoted сервер второй раз КП не примет — переход
  // quoted → quoted запрещён и вернёт 422. Пока сюда входил и quoted, кнопка
  // «Отправить КП клиенту» оставалась активной рядом с «Опубликовать счёт»
  // и вела в ошибку. Секция ниже продолжает показываться и на quoted/accepted,
  // но уже только на чтение.
  const canQuote =
    rfq && rfq.status === "in_review" && (isMine || user?.role === "admin");
  const canConvert = rfq?.status === "accepted" && (isMine || user?.role === "admin");
  const invoice = invoiceQuery.data;
  const canManageInvoice = isMine || user?.role === "admin";
  const canPublishInvoice =
    !!invoice &&
    invoice.status === "draft" &&
    canManageInvoice;
  const canDownloadInvoice =
    !!invoice && (!!invoice.pdf_key || !!invoice.pdf_url || invoice.status === "published");

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
          : "PDF ещё не готов — опубликуйте счёт и подождите генерацию",
      );
    }
  }

  function updateLine(key: string, patch: Partial<QuoteLine>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function addLine() {
    const template = lines[0] ?? {
      product_id: rfq?.items[0]?.product_id ?? "",
      sku: rfq?.items[0]?.sku ?? "",
      name: rfq?.items[0]?.name ?? "",
      qty: 1,
      unit_price_amount: "",
      option_type: null as string | null,
      parent_line_id: null as string | null,
    };
    if (!template.product_id) {
      toast.message("Нет шаблона позиции — добавьте товар в RFQ со стороны клиента");
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        ...template,
        key: `new-${Date.now()}`,
        unit_price_amount: "",
      },
    ]);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/commerce"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />К очереди
        </Link>
      </div>

      <StateBlock
        isLoading={detailQuery.isLoading}
        isError={detailQuery.isError}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        isEmpty={detailQuery.isSuccess && !rfq}
        emptyTitle="RFQ не найден"
      >
        {rfq ? (
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-bold">
                    RFQ {rfq.id.slice(0, 8)}…
                  </h1>
                  <span
                    className={cn(
                      "rounded-lg px-2 py-1 text-[10px] font-bold uppercase",
                      tone === "success" &&
                        "bg-emerald-500/15 text-emerald-700",
                      tone === "primary" && "bg-primary-soft text-primary",
                      tone === "warning" && "bg-amber-500/15 text-amber-700",
                      tone === "danger" && "bg-red-500/15 text-red-700",
                      tone === "muted" && "bg-muted text-muted-foreground",
                    )}
                  >
                    {rfqStatusLabel(rfq.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Создан {formatRfqDate(rfq.created_at)}
                  {rfq.quote?.total ? ` · КП итого ${formatMoney(rfq.quote.total)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canTake ? (
                  <Button
                    disabled={takeMutation.isPending}
                    onClick={() => takeMutation.mutate()}
                  >
                    Взять в работу
                  </Button>
                ) : null}
                {canConvert ? (
                  <Button
                    variant="outline"
                    disabled={convertMutation.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Создать заказ из принятого RFQ? (fallback, если заказ не создался при принятии КП)",
                        )
                      ) {
                        convertMutation.mutate();
                      }
                    }}
                  >
                    В заказ
                  </Button>
                ) : null}
                {rfq?.order_id ? (
                  <Link
                    to="/admin/orders/$orderId"
                    params={{ orderId: rfq.order_id }}
                    className="inline-flex h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold text-primary"
                  >
                    Перейти к заказу
                  </Link>
                ) : rfq?.status === "converted_to_order" ? (
                  <p className="w-full text-xs text-muted-foreground sm:w-auto">
                    Заказ уже создан при принятии КП.
                  </p>
                ) : null}
              </div>
            </header>

            <section className="grid gap-4 rounded-3xl border border-border bg-card p-5 sm:grid-cols-2">
              <div>
                <h2 className="text-sm font-bold">Клиент</h2>
                {customer ? (
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="font-semibold">{customer.full_name || "—"}</p>
                    <p className="text-muted-foreground">
                      {customer.organization || "Без организации"} ·{" "}
                      {customer.city || "—"}
                    </p>
                    <p className="text-muted-foreground">
                      {customer.phone || "нет телефона"} ·{" "}
                      {customer.verification_status}
                    </p>
                    <Link
                      to="/admin/users/$customerId"
                      params={{ customerId: customer.id }}
                      className="inline-block text-xs font-semibold text-primary"
                    >
                      Карточка клиента →
                    </Link>
                  </div>
                ) : (
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    user {rfq.client_id}
                  </p>
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold">Комментарий клиента</h2>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                  {rfq.comment?.trim() || "—"}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold">Позиции запроса</h2>
              <ul className="mt-3 divide-y divide-border">
                {rfq.items.map((item, i) => (
                  <li
                    key={`${item.product_id}-${i}`}
                    className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold">{item.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {item.sku}
                        {item.option_type ? ` · ${item.option_type}` : ""}
                      </div>
                    </div>
                    <div className="text-xs">
                      ×{item.qty}
                      {item.unit_price ? ` · ${formatMoney(item.unit_price)}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {canQuote || rfq.status === "quoted" || rfq.status === "accepted" ? (
              <section className="space-y-4 rounded-3xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold">Конструктор КП</h2>
                  {canQuote ? (
                    <button
                      type="button"
                      onClick={addLine}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Добавить позицию
                    </button>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {lines.map((line) => (
                    <div
                      key={line.key}
                      className="grid gap-2 rounded-2xl border border-border p-3 sm:grid-cols-[1fr_90px_110px_100px_36px]"
                    >
                      <label className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Название
                        <input
                          value={line.name}
                          disabled={!canQuote}
                          onChange={(e) =>
                            updateLine(line.key, { name: e.target.value })
                          }
                          className={fieldClass}
                        />
                      </label>
                      <label className="text-[10px] font-semibold uppercase text-muted-foreground">
                        SKU
                        <input
                          value={line.sku}
                          disabled={!canQuote}
                          onChange={(e) =>
                            updateLine(line.key, { sku: e.target.value })
                          }
                          className={fieldClass}
                        />
                      </label>
                      <label className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Кол-во
                        <input
                          type="number"
                          min={1}
                          value={line.qty}
                          disabled={!canQuote}
                          onChange={(e) =>
                            updateLine(line.key, {
                              qty: Number(e.target.value) || 1,
                            })
                          }
                          className={fieldClass}
                        />
                      </label>
                      <label className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Цена
                        <input
                          value={line.unit_price_amount ?? ""}
                          disabled={!canQuote}
                          placeholder="по запросу"
                          onChange={(e) =>
                            updateLine(line.key, {
                              unit_price_amount: e.target.value,
                            })
                          }
                          className={fieldClass}
                        />
                      </label>
                      {canQuote ? (
                        <button
                          type="button"
                          aria-label="Удалить позицию"
                          className="mt-6 grid h-10 w-9 place-items-center text-destructive"
                          onClick={() =>
                            setLines((prev) =>
                              prev.filter((l) => l.key !== line.key),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold">
                    Срок действия КП
                    <input
                      type="date"
                      value={validUntil}
                      disabled={!canQuote}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs font-semibold sm:col-span-2">
                    Условия / комментарий менеджера
                    <textarea
                      value={conditions}
                      disabled={!canQuote}
                      onChange={(e) => setConditions(e.target.value)}
                      className="mt-1.5 min-h-[88px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                </div>

                {canQuote ? (
                  <Button
                    disabled={publishMutation.isPending || lines.length === 0}
                    onClick={() => publishMutation.mutate()}
                  >
                    {publishMutation.isPending
                      ? "Отправка…"
                      : "Отправить КП клиенту"}
                  </Button>
                ) : null}
              </section>
            ) : null}

            {rfq.status === "quoted" ||
            rfq.status === "accepted" ||
            invoice ||
            invoiceQuery.isFetching ? (
              <section className="space-y-4 rounded-3xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold">Счёт</h2>
                  {invoice ? (
                    <span
                      className={cn(
                        "rounded-lg px-2 py-1 text-[10px] font-bold uppercase",
                        invoice.status === "published"
                          ? "bg-emerald-500/15 text-emerald-700"
                          : "bg-amber-500/15 text-amber-700",
                      )}
                    >
                      {invoice.status === "published"
                        ? "Опубликован"
                        : "Черновик"}
                    </span>
                  ) : null}
                </div>

                {invoiceQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Загрузка счёта…</p>
                ) : !invoice ? (
                  <p className="text-sm text-muted-foreground">
                    Счёт появится после отправки КП (черновик создаётся
                    автоматически).
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span>
                        Итого:{" "}
                        <span className="font-semibold text-foreground">
                          {formatMoney(invoice.total, "—")}
                        </span>
                      </span>
                      <span className="font-mono text-xs">
                        id {invoice.id.slice(0, 8)}…
                      </span>
                    </div>

                    <ul className="divide-y divide-border rounded-2xl border border-border">
                      {invoice.items.map((item, i) => (
                        <li
                          key={`${item.sku}-${i}`}
                          className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold">{item.name}</div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {item.sku}
                            </div>
                          </div>
                          <div className="text-xs text-right">
                            ×{item.qty}
                            {item.unit_price ? ` · ${formatMoney(item.unit_price)}` : ""}
                            {item.line_total ? (
                              <div className="font-semibold text-foreground">
                                {formatMoney(item.line_total)}
                              </div>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>

                    {invoice.requisites.trim() ? (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {invoice.requisites}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {canPublishInvoice ? (
                        <Button
                          disabled={publishInvoiceMutation.isPending}
                          onClick={() =>
                            publishInvoiceMutation.mutate(invoice.id)
                          }
                        >
                          {publishInvoiceMutation.isPending
                            ? "Публикация…"
                            : "Опубликовать счёт"}
                        </Button>
                      ) : null}
                      {canDownloadInvoice ? (
                        <Button
                          variant="outline"
                          onClick={() => void onDownloadInvoice()}
                        >
                          <Download className="mr-1.5 h-4 w-4" aria-hidden />
                          Скачать PDF
                        </Button>
                      ) : null}
                    </div>

                    {invoice.status === "published" && !invoice.pdf_key ? (
                      <p className="text-xs text-muted-foreground">
                        PDF генерируется в фоне — обновите страницу через
                        несколько секунд.
                      </p>
                    ) : null}
                  </>
                )}
              </section>
            ) : null}
          </>
        ) : null}
      </StateBlock>
    </div>
  );
}
