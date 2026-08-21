import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/LocaleProvider";

export type ProductTab = {
  /** Устойчивый ключ вкладки — по нему строятся id для aria-controls. */
  key: string;
  label: string;
  /**
   * Подпись для телефона. «Технические характеристики» в полную ширину
   * занимает почти весь экран 390px, и соседние ярлыки уезжают за край —
   * о существовании вкладки «Видео» пришлось бы догадываться.
   */
  shortLabel?: string;
  content: ReactNode;
};

/**
 * Вкладки под фотографией товара: характеристики, документация, видео.
 *
 * Раньше эти три блока шли лентой один под другим, и описание на три тысячи
 * знаков отодвигало документы за пределы двух экранов — до них не доходили.
 *
 * Пустые разделы сюда не попадают (их отсеивает вызывающая сторона), поэтому
 * вкладка без содержимого не появляется: пустой раздел выглядит как поломка.
 *
 * Клавиатура работает так, как ожидается от вкладок: Tab попадает только на
 * активный ярлык, а между ярлыками ходят стрелками (roving tabindex).
 */
export function ProductTabs({ tabs }: { tabs: ProductTab[] }) {
  const t = useT();
  const baseId = useId();
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  if (tabs.length === 0) return null;

  // Вкладок может стать меньше при переходе на другой товар.
  const index = Math.min(active, tabs.length - 1);
  const tabId = (i: number) => `${baseId}-tab-${tabs[i].key}`;
  const panelId = (i: number) => `${baseId}-panel-${tabs[i].key}`;

  function focusTab(next: number) {
    const bounded = (next + tabs.length) % tabs.length;
    setActive(bounded);
    refs.current[bounded]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") focusTab(index - 1);
    else if (e.key === "ArrowRight") focusTab(index + 1);
    else if (e.key === "Home") focusTab(0);
    else if (e.key === "End") focusTab(tabs.length - 1);
    else return;
    e.preventDefault();
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card">
      {/* Ярлыки листаются вбок: «Технические характеристики» в одну строку
          с остальными на телефон не помещается. */}
      <div
        role="tablist"
        aria-label={t("Информация о товаре")}
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-border px-2 pt-2"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(i)}
            aria-selected={i === index}
            aria-controls={panelId(i)}
            tabIndex={i === index ? 0 : -1}
            onClick={() => setActive(i)}
            className={cn(
              "min-h-11 shrink-0 whitespace-nowrap rounded-t-xl px-2.5 text-sm font-semibold transition sm:px-4",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
              i === index
                ? "tab-pill text-foreground shadow-[inset_0_-2px_0_var(--color-primary)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.shortLabel ? (
              <>
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </>
            ) : (
              tab.label
            )}
          </button>
        ))}
      </div>

      {tabs.map((tab, i) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={panelId(i)}
          aria-labelledby={tabId(i)}
          hidden={i !== index}
          tabIndex={0}
          className="p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
        >
          {i === index ? tab.content : null}
        </div>
      ))}
    </section>
  );
}
