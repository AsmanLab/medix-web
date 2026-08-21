import type { PromotionListItem } from "@/api/cms";
import { identityTranslate, type Translate } from "@/i18n/dictionaries";

export type PromotionPeriodStatus = "active" | "upcoming" | "expired";

export function promotionPeriodStatus(
  item: Pick<PromotionListItem, "starts_at" | "ends_at">,
  now = new Date(),
): PromotionPeriodStatus {
  const start = item.starts_at ? new Date(item.starts_at) : null;
  const end = item.ends_at ? new Date(item.ends_at) : null;

  if (start && !Number.isNaN(start.getTime()) && now < start) {
    return "upcoming";
  }
  if (end && !Number.isNaN(end.getTime()) && now > end) {
    return "expired";
  }
  return "active";
}

/**
 * Период акции в тон статусной таблетки — по образцу `orderStatusTone`
 * и соседей. Без этого маппинга цвет периода собирался прямо в разметке
 * и жил отдельно от остальных статусов системы.
 */
export function promotionStatusTone(
  status: PromotionPeriodStatus,
): "success" | "primary" | "muted" {
  switch (status) {
    case "active":
      return "success";
    case "upcoming":
      return "primary";
    case "expired":
      return "muted";
  }
}

export function promotionStatusLabel(
  status: PromotionPeriodStatus,
  t: Translate = identityTranslate,
): string {
  switch (status) {
    case "active":
      return t("Активна");
    case "upcoming":
      return t("Скоро");
    case "expired":
      return t("Истекла");
  }
}

export function formatPromotionDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function promotionDateRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  t: Translate = identityTranslate,
): string {
  const start = formatPromotionDate(startsAt);
  const end = formatPromotionDate(endsAt);
  if (start && end) return `${start} — ${end}`;
  if (start) return t("с {start}", { start });
  if (end) return t("до {end}", { end });
  return t("Сроки не указаны");
}

export function mapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
