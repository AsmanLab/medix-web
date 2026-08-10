import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  fetchCustomerVerificationAudit,
  listManagerCustomers,
  rejectCustomer,
  requestCustomerInfo,
  verifyCustomer,
} from "@/api/customers";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { clientTypeLabel, verificationLabel } from "@/features/profile/labels";
import { requireStaffPanel } from "@/session/guards";
import { StatusPill } from "@/components/ui/status-pill";

export const Route = createFileRoute("/admin/users/$customerId")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin", "manager"] }),
  component: CustomerDetailPage,
});

function statusTone(status: string) {
  if (status === "verified") return "success";
  if (status === "rejected") return "danger";
  if (status === "pending_verification" || status === "pending")
    return "warning";
  return "muted";
}

function formatAuditDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [missingInfo, setMissingInfo] = useState("");

  const listQuery = useQuery({
    queryKey: queryKeys.adminCustomers.list(null),
    queryFn: ({ signal }) => listManagerCustomers(null, signal),
  });

  const customer = useMemo(
    () => (listQuery.data ?? []).find((c) => c.id === customerId) ?? null,
    [customerId, listQuery.data],
  );

  const auditQuery = useQuery({
    queryKey: queryKeys.adminCustomers.audit(customerId),
    queryFn: ({ signal }) => fetchCustomerVerificationAudit(customerId, signal),
  });

  const audits = useMemo(
    () =>
      (auditQuery.data ?? [])
        .slice()
        .sort(
          (a, b) =>
            new Date(b.occurred_at).getTime() -
            new Date(a.occurred_at).getTime(),
        ),
    [auditQuery.data],
  );

  async function invalidateCustomer() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.adminCustomers.all,
    });
  }

  const verifyMutation = useMutation({
    mutationFn: () => verifyCustomer(customerId, comment.trim()),
    onSuccess: async () => {
      toast.success("Клиент верифицирован");
      setComment("");
      await invalidateCustomer();
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось верифицировать");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectCustomer(customerId, rejectReason.trim()),
    onSuccess: async () => {
      toast.success("Верификация отклонена");
      setRejectReason("");
      await invalidateCustomer();
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось отклонить");
    },
  });

  const clarifyMutation = useMutation({
    mutationFn: () => requestCustomerInfo(customerId, missingInfo.trim()),
    onSuccess: async () => {
      toast.success("Запрос уточнения отправлен");
      setMissingInfo("");
      await invalidateCustomer();
    },
    onError: (err) => {
      toast.error(
        isAppError(err) ? err.message : "Не удалось запросить уточнение",
      );
    },
  });

  const busy =
    verifyMutation.isPending ||
    rejectMutation.isPending ||
    clarifyMutation.isPending;

  const tone = customer ? statusTone(customer.verification_status) : "muted";

  // Домен разрешает verify/reject/request-info только из pending_verification
  // (customers/domain/entities.py). Клиент попадает туда после первого RFQ или
  // заказа. Без этой проверки кнопки активны на unverified и всегда дают 422.
  const canModerate = customer?.verification_status === "pending_verification";

  return (
    <div className="space-y-6">
      <Link
        to="/admin/users"
        search={{ status: undefined, q: undefined }}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />К списку клиентов
      </Link>

      <StateBlock
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        error={listQuery.error}
        isEmpty={listQuery.isSuccess && !customer}
        onRetry={() => void listQuery.refetch()}
        loadingVariant="detail"
        emptyTitle="Клиент не найден"
        emptyDescription="Возможно, профиль удалён или id неверный."
      >
        {customer ? (
          <>
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Клиент
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold">
                  {customer.full_name || "Без имени"}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {[
                    customer.organization,
                    clientTypeLabel(customer.client_type),
                    customer.city,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <StatusPill tone={tone}>
                {verificationLabel(customer.verification_status)}
              </StatusPill>
            </header>

            <section className="rounded-3xl border border-border bg-card p-5">
              <h2 className="font-semibold">Профиль</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Адрес</dt>
                  <dd className="mt-0.5 font-medium">
                    {customer.address || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Телефон</dt>
                  <dd className="mt-0.5 font-mono font-medium">
                    {customer.phone || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">User ID</dt>
                  <dd className="mt-0.5 break-all font-mono text-xs">
                    {customer.user_id}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Profile ID</dt>
                  <dd className="mt-0.5 break-all font-mono text-xs">
                    {customer.id}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="space-y-4 rounded-3xl border border-border bg-card p-5">
              <h2 className="font-semibold">Действия верификации</h2>

              {!canModerate && (
                <p className="rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                  Действия доступны только в статусе «На проверке». Клиент
                  попадает в него автоматически после первого запроса КП или
                  заказа.
                </p>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="verify-comment"
                  className="block text-xs font-semibold"
                >
                  Комментарий к подтверждению (необязательно)
                </label>
                <input
                  id="verify-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="field-control"
                  placeholder="Документы в порядке…"
                  disabled={busy}
                />
                <Button
                  type="button"
                  disabled={busy || !canModerate}
                  onClick={() => verifyMutation.mutate()}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  {verifyMutation.isPending
                    ? "Подтверждаем…"
                    : "Верифицировать"}
                </Button>
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <label
                  htmlFor="reject-reason"
                  className="block text-xs font-semibold"
                >
                  Причина отклонения *
                </label>
                <textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="field-control min-h-24 resize-y"
                  placeholder="Недостаточно документов…"
                  disabled={busy}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    busy || !canModerate || rejectReason.trim().length < 3
                  }
                  onClick={() => rejectMutation.mutate()}
                >
                  <XCircle className="h-4 w-4" aria-hidden />
                  {rejectMutation.isPending ? "Отклоняем…" : "Отклонить"}
                </Button>
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <label
                  htmlFor="missing-info"
                  className="block text-xs font-semibold"
                >
                  Что уточнить *
                </label>
                <textarea
                  id="missing-info"
                  value={missingInfo}
                  onChange={(e) => setMissingInfo(e.target.value)}
                  rows={3}
                  className="field-control min-h-24 resize-y"
                  placeholder="Нужен ИНН / лицензия / адрес…"
                  disabled={busy}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    busy || !canModerate || missingInfo.trim().length < 3
                  }
                  onClick={() => clarifyMutation.mutate()}
                >
                  <HelpCircle className="h-4 w-4" aria-hidden />
                  {clarifyMutation.isPending
                    ? "Отправляем…"
                    : "Запросить уточнение"}
                </Button>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-5">
              <h2 className="font-semibold">История верификации</h2>
              <div className="mt-4">
                <StateBlock
                  isLoading={auditQuery.isLoading}
                  isError={auditQuery.isError}
                  error={auditQuery.error}
                  isEmpty={auditQuery.isSuccess && audits.length === 0}
                  onRetry={() => void auditQuery.refetch()}
                  loadingVariant="list"
                  loadingCount={3}
                  emptyTitle="Записей пока нет"
                  emptyDescription="История появится после первого действия."
                >
                  <ol className="space-y-3">
                    {audits.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-2xl border border-border bg-background px-4 py-3"
                      >
                        <p className="text-sm font-semibold">
                          {verificationLabel(entry.old_status)} →{" "}
                          {verificationLabel(entry.new_status)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatAuditDate(entry.occurred_at)}
                        </p>
                        {entry.comment ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {entry.comment}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </StateBlock>
              </div>
            </section>
          </>
        ) : null}
      </StateBlock>
    </div>
  );
}
