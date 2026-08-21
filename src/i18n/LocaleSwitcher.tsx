import { useLocale } from "@/i18n/LocaleProvider";
import {
  AVAILABLE_LOCALES,
  LOCALE_LABELS,
  LOCALE_SHORT,
  isLocale,
} from "@/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * Переключатель языка.
 *
 * **Пока язык один — не рисуется вовсе.** Это не заглушка на будущее:
 * 10.08 нерабочую кнопку «RU» с витрины сняли именно потому, что она
 * обещала выбор, которого нет. Компонент появится сам, когда в
 * `AVAILABLE_LOCALES` добавят второй язык — то есть когда переводы
 * действительно заведены в админке.
 *
 * `<select>`, а не свой выпадающий список: при двух-трёх вариантах он
 * даёт правильную клавиатуру, правильное поведение на телефоне
 * (нативное колесо выбора) и не требует ловушки фокуса.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  if (AVAILABLE_LOCALES.length < 2) return null;

  return (
    <label className={cn("inline-flex items-center", className)}>
      <span className="sr-only">Язык сайта</span>
      <select
        value={locale}
        onChange={(e) => {
          const next = e.target.value;
          if (isLocale(next)) setLocale(next);
        }}
        className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm font-semibold"
      >
        {AVAILABLE_LOCALES.map((item) => (
          // Короткая подпись в кнопке, полная — в списке: «RU» в шапке
          // занимает мало места, а «Русский» в раскрытом списке понятнее.
          <option key={item} value={item} label={LOCALE_SHORT[item]}>
            {LOCALE_LABELS[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
