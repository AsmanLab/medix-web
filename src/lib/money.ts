/**
 * Форматирование денег для показа.
 *
 * Сервер отдаёт цены строкой вида «50000.00 KGS» — так они и выводились
 * на витрине: без разделителей разрядов, с висящими нулями и кодом валюты.
 * Шестизначные суммы в таком виде читаются с трудом.
 *
 * Здесь только представление. Разбирать цены для арифметики нужно
 * `parseUnitPriceAmount` из configurator-logic: форматированную строку
 * обратно в число не превратить.
 */

const CURRENCY_LABEL: Record<string, string> = {
  KGS: "сом",
  USD: "$",
  EUR: "€",
  RUB: "₽",
};

export type ParsedMoney = { amount: number; currency: string };

/** «50000.00 KGS» → { amount: 50000, currency: "KGS" }. */
export function parseMoney(raw: string | null | undefined): ParsedMoney | null {
  if (!raw) return null;
  const text = String(raw).trim();
  const amountMatch = /-?\d[\d\s ]*(?:[.,]\d+)?/.exec(text);
  if (!amountMatch) return null;

  const amount = Number(
    amountMatch[0].replace(/[\s ]/g, "").replace(",", "."),
  );
  if (!Number.isFinite(amount)) return null;

  // Регистр не трогаем: строку могут прогнать через форматирование дважды,
  // и «сом» не должен превратиться в «СОМ».
  const currency = /([A-Za-zА-Яа-я$€₽]{1,4})\s*$/.exec(text)?.[1] ?? "";
  return { amount, currency };
}

export function formatAmount(amount: number, currency = "KGS"): string {
  // Копейки показываем только когда они есть: «50 000 сом» вместо «50 000,00 сом».
  const hasFraction = Math.abs(amount % 1) > 0.0001;
  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);

  const label = CURRENCY_LABEL[currency.toUpperCase()] ?? currency;
  return label ? `${formatted} ${label}` : formatted;
}

/**
 * «50000.00 KGS» → «50 000 сом». Нераспознанное возвращается как есть —
 * показать сырую строку лучше, чем пустое место.
 */
export function formatMoney(
  raw: string | null | undefined,
  fallback = "",
): string {
  if (!raw) return fallback;
  const parsed = parseMoney(raw);
  if (!parsed) return String(raw);
  return formatAmount(parsed.amount, parsed.currency);
}

/** Цена товара: «Цена по запросу», когда её нет. */
export function formatPrice(raw: string | null | undefined): string {
  return formatMoney(raw, "Цена по запросу");
}
