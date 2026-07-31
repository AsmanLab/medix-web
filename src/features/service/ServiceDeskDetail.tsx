import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import {
  acceptServiceRequest,
  addServiceComment,
  assignServiceRequest,
  fetchServiceRequest,
  listServiceEngineers,
  updateServiceRequestStatus,
  type ServiceRequest,
} from "@/api/service-requests";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import {
  formatServiceDate,
  serviceStatusLabel,
  serviceStatusTone,
} from "@/features/service/status";
import { useSession } from "@/session/store";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-1.5 flex h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Props = {
  requestId: string;
  /** Show assign-engineer dropdown (manager/admin). */
  allowAssign?: boolean;
};

export function ServiceDeskDetail({ requestId, allowAssign = false }: Props) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [comment, setComment] = useState("");
  const [engineerId, setEngineerId] = useState("");

  const detailQuery = useQuery({
    queryKey: queryKeys.service.detail(requestId),
    queryFn: ({ signal }) => fetchServiceRequest(requestId, signal),
    retry: (count, err: unknown) => {
      if (isAppError(err) && err.status === 404) return false;
      return count < 1;
    },
  });

  const engineersQuery = useQuery({
    queryKey: queryKeys.service.engineers(),
    queryFn: ({ signal }) => listServiceEngineers(signal),
    enabled: allowAssign && (user?.role === "admin" || user?.role === "manager"),
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.service.all });
  }

  const acceptMutation = useMutation({
    mutationFn: () => acceptServiceRequest(requestId),
    onSuccess: async () => {
      toast.success("Заявка принята");
      await invalidate();
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось принять");
    },
  });

  const assignSelfMutation = useMutation({
    mutationFn: () => assignServiceRequest(requestId, null),
    onSuccess: async () => {
      toast.success("Заявка назначена на вас");
      await invalidate();
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось назначить");
    },
  });

  const assignOtherMutation = useMutation({
    mutationFn: (id: string) => assignServiceRequest(requestId, id),
    onSuccess: async () => {
      toast.success("Инженер назначен");
      await invalidate();
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось назначить инженера");
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateServiceRequestStatus(requestId, status),
    onSuccess: async () => {
      toast.success("Статус обновлён");
      await invalidate();
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось сменить статус");
    },
  });

  const commentMutation = useMutation({
    mutationFn: (text: string) => addServiceComment(requestId, text),
    onSuccess: async () => {
      toast.success("Комментарий отправлен клиенту");
      setComment("");
      await invalidate();
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось добавить комментарий");
    },
  });

  const sr = detailQuery.data;
  const tone = sr ? serviceStatusTone(sr.status) : "muted";
  const actions = sr ? nextActions(sr, user?.role, user?.userId) : [];

  return (
    <StateBlock
      isLoading={detailQuery.isLoading}
      isError={detailQuery.isError}
      error={detailQuery.error}
      onRetry={() => void detailQuery.refetch()}
      isEmpty={detailQuery.isSuccess && !sr}
      emptyTitle="Заявка не найдена"
    >
      {sr ? (
        <div className="space-y-5">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold">
                {sr.equipment_type || "Заявка"}
                {sr.model ? ` · ${sr.model}` : ""}
              </h1>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{sr.id}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Создана {formatServiceDate(sr.created_at)}
              </p>
            </div>
            <span
              className={cn(
                "rounded-lg px-2 py-1 text-[10px] font-bold uppercase",
                tone === "success" && "bg-emerald-500/15 text-emerald-700",
                tone === "primary" && "bg-primary-soft text-primary",
                tone === "warning" && "bg-amber-500/15 text-amber-700",
                tone === "danger" && "bg-red-500/15 text-red-700",
                tone === "muted" && "bg-muted text-muted-foreground",
              )}
            >
              {serviceStatusLabel(sr.status)}
            </span>
          </header>

          <section className="grid gap-4 rounded-3xl border border-border bg-card p-5 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-bold">Клиент</h2>
              <p className="mt-2 text-sm font-semibold">
                {sr.contact_name?.trim() || "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {sr.contact_phone || "нет телефона"}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                user {sr.client_id}
              </p>
            </div>
            <div>
              <h2 className="text-sm font-bold">Адрес</h2>
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                {sr.address?.trim() || "—"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <h2 className="text-sm font-bold">Описание</h2>
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                {sr.description?.trim() || "—"}
              </p>
              {sr.serial_number ? (
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  S/N {sr.serial_number}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold">Фото поломки</h2>
            {!sr.photo_urls?.length ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Клиент не приложил фото
              </p>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {sr.photo_urls.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-2xl border border-border"
                    >
                      <img
                        src={url}
                        alt="Фото к сервисной заявке"
                        loading="lazy"
                        decoding="async"
                        className="aspect-square w-full object-cover"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {actions.length > 0 ? (
            <section className="flex flex-wrap gap-2 rounded-3xl border border-border bg-card p-5">
              {actions.map((action) => (
                <Button
                  key={action.key}
                  disabled={
                    acceptMutation.isPending ||
                    assignSelfMutation.isPending ||
                    statusMutation.isPending
                  }
                  onClick={() => {
                    if (action.key === "accept") acceptMutation.mutate();
                    else if (action.key === "assign_self")
                      assignSelfMutation.mutate();
                    else statusMutation.mutate(action.status!);
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </section>
          ) : null}

          {allowAssign ? (
            <section className="space-y-3 rounded-3xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold">Назначить инженера</h2>
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-[220px] flex-1 text-xs font-semibold">
                  Инженер
                  <select
                    value={engineerId}
                    onChange={(e) => setEngineerId(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Выберите…</option>
                    {(engineersQuery.data ?? []).map((eng) => (
                      <option key={eng.id} value={eng.id}>
                        {eng.phone}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  disabled={!engineerId || assignOtherMutation.isPending}
                  onClick={() => assignOtherMutation.mutate(engineerId)}
                >
                  Назначить
                </Button>
              </div>
            </section>
          ) : null}

          {sr.status_history.length > 0 ? (
            <section className="space-y-3 rounded-3xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold">История статусов</h2>
              <ol className="space-y-2.5">
                {sr.status_history.map((h, index) => (
                  <li
                    key={`${h.status}-${h.occurred_at}-${index}`}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm"
                  >
                    <span className="font-semibold">
                      {serviceStatusLabel(h.status)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatServiceDate(h.occurred_at)}
                    </span>
                    {h.comment ? (
                      <span className="basis-full text-xs text-muted-foreground">
                        {h.comment}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="space-y-3 rounded-3xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold">Комментарий клиенту</h2>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Виден клиенту в карточке заявки"
              className="min-h-[88px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              disabled={!comment.trim() || commentMutation.isPending}
              onClick={() => commentMutation.mutate(comment.trim())}
            >
              Отправить комментарий
            </Button>

            {sr.comments.length > 0 ? (
              <ul className="mt-4 divide-y divide-border border-t border-border pt-3">
                {sr.comments.map((c) => (
                  <li key={c.id} className="py-2 text-sm">
                    <p className="whitespace-pre-wrap">{c.text}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatServiceDate(c.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      ) : null}
    </StateBlock>
  );
}

type NextAction = {
  key: string;
  label: string;
  status?: string;
};

function nextActions(
  sr: ServiceRequest,
  role: string | undefined,
  userId: string | undefined,
): NextAction[] {
  const out: NextAction[] = [];
  const isEngineer = role === "service_engineer";
  const isMine = !!sr.assigned_engineer_id && sr.assigned_engineer_id === userId;

  if (sr.status === "new") {
    out.push({ key: "accept", label: "Принять" });
  }

  if (
    sr.status === "accepted" &&
    !sr.assigned_engineer_id &&
    (isEngineer || role === "admin")
  ) {
    out.push({ key: "assign_self", label: "Взять себе" });
  }

  if (sr.status === "assigned" && (isMine || role === "admin" || role === "manager")) {
    out.push({ key: "start", label: "Начать работу", status: "in_progress" });
  }

  if (
    sr.status === "in_progress" &&
    (isMine || role === "admin" || role === "manager")
  ) {
    out.push({
      key: "waiting",
      label: "Ожидание запчастей",
      status: "waiting_parts",
    });
    out.push({ key: "complete", label: "Завершить", status: "completed" });
  }

  if (
    sr.status === "waiting_parts" &&
    (isMine || role === "admin" || role === "manager")
  ) {
    out.push({
      key: "resume",
      label: "Продолжить работу",
      status: "in_progress",
    });
  }

  if (
    sr.status === "completed" &&
    (role === "admin" || role === "manager")
  ) {
    out.push({ key: "close", label: "Закрыть", status: "closed" });
  }

  return out;
}
