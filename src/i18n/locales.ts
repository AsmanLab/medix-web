/**
 * Языки витрины.
 *
 * Единственное место, где они перечислены. Совпадает с `Locale` на бэкенде
 * (`app/shared/domain/i18n.py`); состав взят из ТЗ сайта, стр. 514 —
 * русский, кыргызский, английский.
 */
export const LOCALES = ["ru", "ky", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * Основной язык (ТЗ платформы §13.3) и одновременно откат.
 *
 * Непереведённое поле показывается по-русски, а не пустой строкой: пустое
 * место на витрине читается как поломка, русский текст в английском
 * интерфейсе — как незаконченный перевод. Второе честнее.
 */
export const DEFAULT_LOCALE: Locale = "ru";

/**
 * Языки, которые показываются в переключателе.
 *
 * Пока здесь один русский, и переключатель поэтому **не рисуется вовсе** —
 * ровно так же, как 10.08 с витрины сняли нерабочую кнопку «RU»: она
 * обещала выбор, которого нет. Подключить кыргызский на следующем этапе —
 * дописать сюда `"ky"`, когда переводы заведены в админке.
 *
 * Отдельный список, а не `LOCALES`, потому что это разные вещи: механика
 * знает три языка (и API их принимает), а витрина показывает только те,
 * на которых действительно есть текст.
 */
export const AVAILABLE_LOCALES: readonly Locale[] = ["ru"];

/** Как язык называется на самом себе — так его и подписывают в переключателях. */
export const LOCALE_LABELS: Record<Locale, string> = {
  ru: "Русский",
  ky: "Кыргызча",
  en: "English",
};

/** Короткая подпись для кнопки в шапке. */
export const LOCALE_SHORT: Record<Locale, string> = {
  ru: "RU",
  ky: "KY",
  en: "EN",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Приводит `ru`, `RU`, `ru-RU` к `ru`. Чужое — `null`.
 *
 * Регион отбрасывается: `ru-KG` и `ru-RU` для нас один язык. Повторяет
 * `parse_locale` на бэкенде — если правило разойдётся, витрина и API
 * начнут по-разному понимать один и тот же `?lang=`.
 */
export function parseLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const tag = value.trim().replace(/_/g, "-").split("-")[0]?.toLowerCase();
  return isLocale(tag) ? tag : null;
}
