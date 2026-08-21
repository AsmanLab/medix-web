import type { ReactNode } from "react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * Переключатель языка в формах админки.
 *
 * ### Почему здесь все языки, а не только включённые на витрине
 *
 * Переводы заводятся **до** того, как язык включат: сначала админ
 * набирает кыргызские названия, и только потом кыргызский появляется
 * в переключателе витрины. Показывать здесь один русский значило бы
 * не дать сделать первый шаг.
 *
 * ### Точка у языка
 *
 * Кружок рядом с названием языка означает «здесь что-то введено».
 * Без него по вкладкам приходится ходить и проверять глазами, а при трёх
 * языках и пяти полях это единственный способ понять, что переведено.
 */
export function LanguageTabs({
  active,
  onChange,
  filled,
  children,
}: {
  active: Locale;
  onChange: (locale: Locale) => void;
  /** Языки, у которых хоть одно поле заполнено. */
  filled: ReadonlySet<Locale>;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/40 p-3">
      <div
        role="tablist"
        aria-label="Язык"
        className="inline-flex rounded-xl border border-border bg-card p-1"
      >
        {LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            role="tab"
            aria-selected={active === locale}
            onClick={() => onChange(locale)}
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition",
              active === locale
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {LOCALE_LABELS[locale]}
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                filled.has(locale) ? "bg-primary" : "bg-border",
              )}
              aria-hidden
            />
            <span className="sr-only">
              {filled.has(locale) ? "заполнено" : "пусто"}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}
