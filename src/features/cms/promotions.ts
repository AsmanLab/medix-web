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

/**
 * Ссылка на поиск адреса на openstreetmap.org — запасной вариант для кнопки
 * "Открыть на карте", пока координаты офиса ещё не геокодированы (или если
 * геокодирование не удалось).
 */
export function osmSearchUrl(address: string): string {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;
}

/**
 * Прямая ссылка на openstreetmap.org с центром по координатам офиса.
 */
export function osmViewUrl(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
}

/**
 * Встраиваемая карта OpenStreetMap по координатам, без API-ключа.
 * OSM не умеет геокодировать текстовый адрес сам (в отличие от старого
 * Google-трюка `maps?q=...`), поэтому адрес офиса сначала геокодируется
 * через Nominatim (см. useOsmGeocode), а тут только строится src iframe.
 */
export function osmEmbedUrl(lat: number, lon: number, delta = 0.01): string {
  const bbox = [lon - delta, lat - delta, lon + delta, lat + delta].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
}
