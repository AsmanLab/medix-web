/**
 * Наличие в тон статусной таблетки — по образцу `orderStatusTone` и соседей.
 *
 * «Под заказ» — не проблема и не успех: это нормальный режим поставки
 * медоборудования, поэтому нейтральный тон, а не предупреждающий.
 */
export function availabilityTone(
  value: string,
): "success" | "muted" | "danger" {
  switch (value) {
    case "in_stock":
      return "success";
    case "out_of_stock":
      return "danger";
    default:
      return "muted";
  }
}

export function availabilityLabel(value: string): string {
  switch (value) {
    case "in_stock":
      return "В наличии";
    case "on_order":
      return "Под заказ";
    case "out_of_stock":
      return "Нет в наличии";
    default:
      return value;
  }
}
