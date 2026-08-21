import { identityTranslate, type Translate } from "@/i18n/dictionaries";

/** См. features/rfq/status.ts — тот же приём для меток статусов. */
const identity = identityTranslate;

export type OrderStatus =
  | "new"
  | "confirmed"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled"
  | string;

export function orderStatusLabel(status: OrderStatus, t: Translate = identity): string {
  switch (status) {
    case "new":
      return t("Новый");
    case "confirmed":
      return t("Подтверждён");
    case "processing":
      return t("В обработке");
    case "shipped":
      return t("Отправлен");
    case "completed":
      return t("Завершён");
    case "cancelled":
      return t("Отменён");
    default:
      return status;
  }
}

export function orderStatusTone(
  status: OrderStatus,
): "primary" | "success" | "warning" | "muted" | "danger" {
  switch (status) {
    case "completed":
    case "shipped":
      return "success";
    case "new":
    case "confirmed":
    case "processing":
      return "primary";
    case "cancelled":
      return "danger";
    default:
      return "muted";
  }
}

/** Значения приходят из Order.source: "direct" | "from_rfq". */
/**
 * Подпись статуса счёта.
 *
 * До этого в карточке заказа выводилось сырое `invoice.status`, и рядом
 * с русской подписью «Счёт» стояло английское «published» (medix-web#103
 * по бэкенду — Medix#88). Значения задаёт InvoiceStatus в домене.
 */
export function invoiceStatusLabel(status: string, t: Translate = identity): string {
  switch (status) {
    case "draft":
      return t("Черновик");
    case "published":
      return t("Выставлен");
    default:
      return status;
  }
}

export function orderSourceLabel(source: string, t: Translate = identity): string {
  switch (source) {
    case "from_rfq":
    case "rfq":
      return t("Из запроса КП");
    case "direct":
      return t("Прямой заказ");
    default:
      return source;
  }
}

/** Переходы, разрешённые доменом (commerce/domain/entities.py, Order). */
const ORDER_TRANSITIONS: Record<string, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

export function nextOrderStatuses(current: OrderStatus): OrderStatus[] {
  return ORDER_TRANSITIONS[current] ?? [];
}
