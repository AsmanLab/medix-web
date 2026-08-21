import { identityTranslate, type Translate } from "@/i18n/dictionaries";

/** См. features/rfq/status.ts — тот же приём для меток статусов. */
const identity = identityTranslate;

export type ServiceStatus =
  | "new"
  | "accepted"
  | "assigned"
  | "in_progress"
  | "waiting_parts"
  | "completed"
  | "closed"
  | "cancelled"
  | string;

export function serviceStatusLabel(
  status: ServiceStatus,
  t: Translate = identity,
): string {
  switch (status) {
    case "new":
      return t("Новая");
    case "accepted":
      return t("Принята");
    case "assigned":
      return t("Назначен инженер");
    case "in_progress":
      return t("В работе");
    case "waiting_parts":
      return t("Ожидание запчастей");
    case "completed":
      return t("Выполнена");
    case "closed":
      return t("Закрыта");
    case "cancelled":
      return t("Отменена");
    default:
      return status;
  }
}

export function serviceStatusTone(
  status: ServiceStatus,
): "primary" | "success" | "warning" | "muted" | "danger" {
  switch (status) {
    case "completed":
    case "closed":
      return "success";
    case "accepted":
    case "assigned":
    case "in_progress":
      return "primary";
    case "waiting_parts":
    case "new":
      return "warning";
    case "cancelled":
      return "danger";
    default:
      return "muted";
  }
}

export type TimelineStep = {
  key: string;
  label: string;
  state: "done" | "active" | "pending" | "skipped";
};

/** Synthetic timeline from current status (API has no history events). */
export function buildServiceTimeline(
  status: ServiceStatus,
  t: Translate = identity,
): TimelineStep[] {
  if (status === "cancelled") {
    return [
      { key: "new", label: t("Новая"), state: "done" },
      { key: "cancelled", label: t("Отменена"), state: "active" },
    ];
  }

  const flow = [
    "new",
    "accepted",
    "assigned",
    "in_progress",
    "completed",
    "closed",
  ] as const;

  const labels: Record<(typeof flow)[number], string> = {
    new: t("Новая"),
    accepted: t("Принята"),
    assigned: t("Инженер назначен"),
    in_progress: t("В работе"),
    completed: t("Выполнена"),
    closed: t("Закрыта"),
  };

  let mapped: (typeof flow)[number] | null =
    status === "waiting_parts"
      ? "in_progress"
      : flow.includes(status as (typeof flow)[number])
        ? (status as (typeof flow)[number])
        : null;

  if (mapped == null) mapped = "new";
  const activeIndex = flow.indexOf(mapped);

  const steps: TimelineStep[] = flow.map((key, index) => {
    let state: TimelineStep["state"] = "pending";
    if (index < activeIndex) state = "done";
    else if (index === activeIndex) state = "active";
    return { key, label: labels[key], state };
  });

  if (status === "waiting_parts") {
    // Insert waiting note after in_progress active
    const idx = steps.findIndex((s) => s.key === "in_progress");
    if (idx >= 0) {
      steps.splice(idx + 1, 0, {
        key: "waiting_parts",
        label: t("Ожидание запчастей"),
        state: "active",
      });
      steps[idx] = { ...steps[idx], state: "done" };
      for (let i = idx + 2; i < steps.length; i++) {
        steps[i] = { ...steps[i], state: "pending" };
      }
    }
  }

  return steps;
}

export function formatServiceDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shortRequestId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}
