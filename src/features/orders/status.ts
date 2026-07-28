export type OrderStatus =
  | "new"
  | "confirmed"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled"
  | string;

export function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "new":
      return "Новый";
    case "confirmed":
      return "Подтверждён";
    case "processing":
      return "В обработке";
    case "shipped":
      return "Отправлен";
    case "completed":
      return "Завершён";
    case "cancelled":
      return "Отменён";
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
export function orderSourceLabel(source: string): string {
  switch (source) {
    case "from_rfq":
    case "rfq":
      return "Из запроса КП";
    case "direct":
      return "Прямой заказ";
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
