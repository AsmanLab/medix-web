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

export function serviceStatusLabel(status: ServiceStatus): string {
  switch (status) {
    case "new":
      return "Новая";
    case "accepted":
      return "Принята";
    case "assigned":
      return "Назначен инженер";
    case "in_progress":
      return "В работе";
    case "waiting_parts":
      return "Ожидание запчастей";
    case "completed":
      return "Выполнена";
    case "closed":
      return "Закрыта";
    case "cancelled":
      return "Отменена";
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
export function buildServiceTimeline(status: ServiceStatus): TimelineStep[] {
  if (status === "cancelled") {
    return [
      { key: "new", label: "Новая", state: "done" },
      { key: "cancelled", label: "Отменена", state: "active" },
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
    new: "Новая",
    accepted: "Принята",
    assigned: "Инженер назначен",
    in_progress: "В работе",
    completed: "Выполнена",
    closed: "Закрыта",
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
        label: "Ожидание запчастей",
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
