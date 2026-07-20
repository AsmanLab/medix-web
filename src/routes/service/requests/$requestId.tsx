import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ImageIcon,
  MessageSquare,
} from "lucide-react";
import { isAppError } from "@/api/errors";
import { fetchServiceRequest } from "@/api/service-requests";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import {
  buildServiceTimeline,
  formatServiceDate,
  serviceStatusLabel,
  serviceStatusTone,
} from "@/features/service/status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/service/requests/$requestId")({
  component: ServiceRequestDetailPage,
});

function ServiceRequestDetailPage() {
  const { requestId } = Route.useParams();

  const detailQuery = useQuery({
    queryKey: queryKeys.service.detail(requestId),
    queryFn: ({ signal }) => fetchServiceRequest(requestId, signal),
    retry: (count, err: unknown) => {
      if (isAppError(err) && err.status === 404) return false;
      return count < 1;
    },
  });

  const sr = detailQuery.data;
  const tone = sr ? serviceStatusTone(sr.status) : "muted";
  const timeline = sr ? buildServiceTimeline(sr.status) : [];
  const showComments =
    !!sr &&
    (sr.comments.length > 0 ||
      ["assigned", "in_progress", "waiting_parts", "completed", "closed"].includes(
        sr.status,
      ));

  return (
    <AppShell>
      <Link
        to="/service/requests"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <ArrowLeft className="h-4 w-4" />К заявкам
      </Link>

      <div className="mt-6">
        <StateBlock
          isLoading={detailQuery.isLoading}
          isError={detailQuery.isError}
          error={detailQuery.error}
          onRetry={() => void detailQuery.refetch()}
        >
          {sr ? (
            <div className="space-y-6">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Сервисная заявка
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-bold">
                    {sr.equipment_type || "Заявка"}
                  </h1>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {sr.id}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Создана {formatServiceDate(sr.created_at)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    tone === "success" && "bg-emerald-100 text-emerald-800",
                    tone === "primary" && "bg-primary-soft text-primary",
                    tone === "danger" && "bg-red-100 text-red-800",
                    tone === "muted" && "bg-muted text-muted-foreground",
                    tone === "warning" && "bg-amber-100 text-amber-900",
                  )}
                >
                  {serviceStatusLabel(sr.status)}
                </span>
              </header>

              <section className="rounded-3xl border border-border bg-card p-5">
                <h2 className="font-semibold">Статус</h2>
                <ol className="mt-4 space-y-3">
                  {timeline.map((step) => (
                    <li key={step.key} className="flex items-start gap-3">
                      {step.state === "done" || step.state === "active" ? (
                        <CheckCircle2
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            step.state === "active"
                              ? "text-primary"
                              : "text-emerald-600",
                          )}
                        />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                      )}
                      <span
                        className={cn(
                          "text-sm",
                          step.state === "pending" && "text-muted-foreground",
                          step.state === "active" && "font-semibold text-primary",
                          step.state === "done" && "text-foreground",
                        )}
                      >
                        {step.label}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="rounded-3xl border border-border bg-card p-5">
                <h2 className="font-semibold">Оборудование и проблема</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <Row label="Тип" value={sr.equipment_type || "—"} />
                  <Row label="Модель" value={sr.model || "—"} />
                  <Row label="Серийный номер" value={sr.serial_number || "—"} />
                  <Row
                    label="Желаемая дата"
                    value={
                      sr.desired_date
                        ? formatServiceDate(sr.desired_date)
                        : "—"
                    }
                  />
                  <div>
                    <dt className="text-xs font-semibold text-muted-foreground">
                      Описание
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap leading-6">
                      {sr.description || "—"}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-3xl border border-border bg-card p-5">
                <h2 className="font-semibold">Контакты и адрес</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <Row label="Адрес" value={sr.address || "—"} />
                  <Row label="Контакт" value={sr.contact_name || "—"} />
                  <Row label="Телефон" value={sr.contact_phone || "—"} />
                  {sr.order_id ? (
                    <Row label="Заказ" value={sr.order_id} mono />
                  ) : null}
                </dl>
              </section>

              <section className="rounded-3xl border border-border bg-card p-5">
                <h2 className="font-semibold">Фото</h2>
                {sr.photo_urls.length === 0 ? (
                  <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                    Фото не приложены
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
                            alt="Фото к заявке"
                            className="aspect-square w-full object-cover"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {showComments ? (
                <section className="rounded-3xl border border-border bg-card p-5">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Комментарии инженера
                  </h2>
                  {sr.comments.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Комментариев пока нет — они появятся после назначения
                      инженера.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {sr.comments.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-2xl border border-border bg-secondary/40 px-4 py-3"
                        >
                          <p className="text-sm leading-6">{c.text}</p>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {formatServiceDate(c.created_at)}
                          </p>
                        </li>
                      ))}
                    </ul>
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

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}
