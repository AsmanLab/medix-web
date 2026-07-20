export type RfqStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "quoted"
  | "accepted"
  | "rejected"
  | "converted_to_order"
  | string;

export function rfqStatusLabel(status: RfqStatus): string {
  switch (status) {
    case "draft":
      return "Черновик";
    case "submitted":
      return "Отправлен";
    case "in_review":
      return "В работе";
    case "quoted":
      return "Есть КП";
    case "accepted":
      return "Принят";
    case "rejected":
      return "Отклонён";
    case "converted_to_order":
      return "В заказ";
    default:
      return status;
  }
}

export function rfqStatusTone(
  status: RfqStatus,
): "primary" | "success" | "warning" | "muted" | "danger" {
  switch (status) {
    case "quoted":
    case "accepted":
    case "converted_to_order":
      return "success";
    case "submitted":
    case "in_review":
      return "primary";
    case "rejected":
      return "danger";
    case "draft":
      return "muted";
    default:
      return "muted";
  }
}

export type TimelineStep = {
  key: string;
  label: string;
  state: "done" | "active" | "pending" | "skipped";
};

/** Synthetic timeline from current RFQ status (API has no history events yet). */
export function buildRfqTimeline(status: RfqStatus): TimelineStep[] {
  if (status === "draft") {
    return [
      { key: "draft", label: "Черновик", state: "active" },
      { key: "submitted", label: "Отправлен", state: "pending" },
      { key: "in_review", label: "В работе", state: "pending" },
      { key: "quoted", label: "Котировка", state: "pending" },
    ];
  }

  if (status === "rejected") {
    return [
      { key: "submitted", label: "Отправлен", state: "done" },
      { key: "in_review", label: "В работе", state: "done" },
      { key: "quoted", label: "Котировка", state: "done" },
      { key: "rejected", label: "Отклонён клиентом", state: "active" },
    ];
  }

  const flow = ["submitted", "in_review", "quoted", "accepted"] as const;
  const labels: Record<(typeof flow)[number], string> = {
    submitted: "Отправлен",
    in_review: "В работе",
    quoted: "Котировка получена",
    accepted: "Принят",
  };

  let activeIndex = flow.indexOf(status as (typeof flow)[number]);
  if (status === "converted_to_order") activeIndex = flow.length - 1;
  if (activeIndex < 0) activeIndex = 0;

  return flow.map((key, index) => {
    let state: TimelineStep["state"] = "pending";
    if (index < activeIndex) state = "done";
    else if (index === activeIndex) state = "active";
    return { key, label: labels[key], state };
  });
}

export function formatRfqDate(iso: string): string {
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
