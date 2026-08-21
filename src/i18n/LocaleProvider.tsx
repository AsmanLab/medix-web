import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  translate,
  type TranslateValues,
} from "@/i18n/dictionaries";
import {
  detectLocale,
  getLocale,
  setLocale as setStoreLocale,
  subscribeToLocale,
} from "@/i18n/locale-store";
import type { Locale } from "@/i18n/locales";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** Перевод строки интерфейса. Ключ — русский текст, см. dictionaries.ts. */
  t: (source: string, values?: TranslateValues) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Язык интерфейса.
 *
 * Само значение живёт вне React (`locale-store`), потому что его читает
 * слой запросов — он к дереву компонентов не подключён. Здесь только
 * подписка и две вещи, которые обязаны происходить при смене языка.
 *
 * ### Кэш запросов сбрасывается
 *
 * Ответы API уже переведены сервером, поэтому после смены языка всё, что
 * лежит в кэше react-query, — на прежнем языке. Без сброса каталог остался
 * бы русским до истечения `staleTime`, то есть смена языка выглядела бы
 * как «наполовину сработало».
 *
 * ### `<html lang>` меняется вместе с интерфейсом
 *
 * Не косметика: по этому атрибуту скринридер выбирает произношение,
 * а браузер — переносы и предложение перевести страницу.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const locale = useSyncExternalStore(subscribeToLocale, getLocale, getLocale);

  // Определение языка — эффектом, а не при инициализации модуля: до первой
  // отрисовки нет ни адресной строки в тестах, ни localStorage на сервере.
  useEffect(() => {
    setStoreLocale(detectLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      setStoreLocale(next);
      void queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (source, values) => translate(locale, source, values),
    }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useLocale вызван вне LocaleProvider");
  }
  return value;
}

/**
 * Только функция перевода — самый частый случай.
 *
 * Отдельный хук, чтобы в компонентах было `const t = useT()`, а не
 * `const { t } = useLocale()` с неиспользуемым остатком.
 */
export function useT(): LocaleContextValue["t"] {
  return useLocale().t;
}
