import {
  AVAILABLE_LOCALES,
  DEFAULT_LOCALE,
  parseLocale,
  type Locale,
} from "@/i18n/locales";

/**
 * Текущий язык — вне React.
 *
 * Так же, как токен доступа в `api/client`: язык нужен слою запросов,
 * а тот к дереву компонентов не подключён. Хранилище с подпиской, поверх
 * которого React-провайдер даёт хук.
 */

const STORAGE_KEY = "medix:locale";

let current: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

/**
 * Откуда берётся язык при первой отрисовке, по убыванию важности:
 *
 * 1. `?lang=` в адресе — присланная ссылка должна открыться на своём языке;
 * 2. прошлый выбор из localStorage;
 * 3. язык браузера.
 *
 * Результат всегда из `AVAILABLE_LOCALES`. Это важно: пока переводов нет
 * ни на чём, кроме русского, посетитель с английским браузером должен
 * увидеть цельный русский сайт, а не английские названия категорий внутри
 * русского интерфейса.
 */
export function detectLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const fromUrl = parseLocale(
    new URLSearchParams(window.location.search).get("lang"),
  );
  if (fromUrl && isAvailable(fromUrl)) return fromUrl;

  const stored = parseLocale(safeRead(STORAGE_KEY));
  if (stored && isAvailable(stored)) return stored;

  const fromBrowser = parseLocale(window.navigator?.language);
  if (fromBrowser && isAvailable(fromBrowser)) return fromBrowser;

  return DEFAULT_LOCALE;
}

function isAvailable(locale: Locale): boolean {
  return AVAILABLE_LOCALES.includes(locale);
}

export function getLocale(): Locale {
  return current;
}

export function setLocale(next: Locale): void {
  if (next === current) return;
  current = next;
  safeWrite(STORAGE_KEY, next);
  for (const listener of listeners) listener();
}

export function subscribeToLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * localStorage бросает в приватном режиме Safari и при запрете cookies.
 * Язык — не то, ради чего стоит падать: не вспомнили выбор, и ладно.
 */
function safeRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* пусто */
  }
}
