import { identityTranslate, type Translate } from "@/i18n/dictionaries";

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

export function availabilityLabel(
  value: string,
  t: Translate = identityTranslate,
): string {
  switch (value) {
    case "in_stock":
      return t("В наличии");
    case "on_order":
      return t("Под заказ");
    case "out_of_stock":
      return t("Нет в наличии");
    default:
      return value;
  }
}
