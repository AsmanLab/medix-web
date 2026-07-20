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
