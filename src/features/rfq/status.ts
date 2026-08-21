import { identityTranslate, type Translate } from "@/i18n/dictionaries";

/**
 * Метки статусов в двух средах сразу: у менеджера в админке (всегда
 * по-русски) и у клиента на витрине (на его языке). `t` необязателен
 * и по умолчанию ничего не переводит — так админские вызовы остаются
 * рабочими без правки, а витринные передают `t` из `useT()`.
 */
const identity = identityTranslate;

export type RfqStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "quoted"
  | "accepted"
  | "rejected"
  | "converted_to_order"
  | string;

export function rfqStatusLabel(status: RfqStatus, t: Translate = identity): string {
  switch (status) {
    case "draft":
      return t("Черновик");
    case "submitted":
      return t("Отправлен");
    case "in_review":
      return t("В работе");
    case "quoted":
      return t("Есть КП");
    case "accepted":
      return t("Принят");
    case "rejected":
      return t("Отклонён");
    case "converted_to_order":
      return t("В заказ");
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
export function buildRfqTimeline(
  status: RfqStatus,
  t: Translate = identity,
): TimelineStep[] {
  if (status === "draft") {
    return [
      { key: "draft", label: t("Черновик"), state: "active" },
      { key: "submitted", label: t("Отправлен"), state: "pending" },
      { key: "in_review", label: t("В работе"), state: "pending" },
      { key: "quoted", label: t("Котировка"), state: "pending" },
    ];
  }

  if (status === "rejected") {
    return [
      { key: "submitted", label: t("Отправлен"), state: "done" },
      { key: "in_review", label: t("В работе"), state: "done" },
      { key: "quoted", label: t("Котировка"), state: "done" },
      { key: "rejected", label: t("Отклонён клиентом"), state: "active" },
    ];
  }

  const flow = ["submitted", "in_review", "quoted", "accepted"] as const;
  const labels: Record<(typeof flow)[number], string> = {
    submitted: t("Отправлен"),
    in_review: t("В работе"),
    quoted: t("Котировка получена"),
    accepted: t("Принят"),
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
