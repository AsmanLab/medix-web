import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { CatalogCategoryNode } from "@/features/catalog/map-category";
import { cn } from "@/lib/utils";

/**
 * Навигация по категориям каталога — одна на каталог и на страницу раздела.
 *
 * Было две копии в route-файлах, разошедшиеся по формулировкам и стилям
 * («Сбросить» против «Показать всё», разные фоны неактивного элемента).
 * Поэтому строки живут здесь и выводятся из `kind`: строку, которой нет
 * в вызове, невозможно случайно разъехать.
 *
 * ### Почему сайдбар, а не раскрывающаяся панель
 *
 * До этого фильтр был выпадающей панелью над сеткой товаров, и это плохо
 * работало на обоих концах:
 *
 * - на ПК панель занимала место по вертикали, хотя справа от неё пустовала
 *   половина ширины; чтобы сменить категорию, приходилось раскрывать
 *   и закрывать её при каждом выборе;
 * - на телефоне раскрытая панель выдавливала товары за экран, то есть
 *   результат выбора не попадал в тот же экран, что и сам выбор.
 *
 * Теперь на ПК это постоянная колонка слева: товары и категории видны
 * одновременно, открывать нечего. На телефоне — кнопка и шторка снизу
 * поверх контента: она не двигает сетку и скроллится отдельно.
 *
 * ### Почему список, а не пилюли
 *
 * Промежуточный вариант делал все уровни одинаковыми пилюлями. Зоны нажатия
 * это починило, но иерархию убило: при восьми разделах по пять подкатегорий
 * получалось сорок одинаковых пилюль, где уровень отличался только отступом.
 * Вертикальный список с отступом читается как дерево, а раздел от
 * подкатегории отличается насыщенностью шрифта.
 *
 * Высота строки — `min-h-11`, то есть 44px: минимум по WCAG 2.5.5 и Apple HIG.
 * Дочерние пилюли прежней версии были 24px.
 */

type CategoryFilterProps = {
  /**
   * Верхний уровень. В каталоге это разделы со своими детьми,
   * на странице раздела — его подкатегории.
   */
  nodes: CatalogCategoryNode[];
  /** `id` выбранного узла; `null` — фильтр снят. */
  selectedId: string | null;
  /** `null` означает сброс. */
  onSelect: (node: CatalogCategoryNode | null) => void;
  kind: "category" | "subcategory";
};

const WORDING = {
  category: {
    heading: "Категории",
    trigger: "Все категории",
    reset: "Все товары",
  },
  subcategory: {
    heading: "Подкатегории",
    trigger: "Все подкатегории",
    reset: "Все товары раздела",
  },
} as const;

export function CategoryFilter({
  nodes,
  selectedId,
  onSelect,
  kind,
}: CategoryFilterProps) {
  const words = WORDING[kind];
  const sheetId = useId();
  const [sheetOpen, setSheetOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const selectedName = findName(nodes, selectedId);

  useEffect(() => {
    if (!sheetOpen) return;

    // Фокус уводим в шторку, иначе Tab продолжит ходить по странице под ней.
    closeRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSheetOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);

    // Блокируем прокрутку страницы: без этого свайп внутри шторки
    // «протекает» на список товаров под ней.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [sheetOpen]);

  function closeSheet() {
    setSheetOpen(false);
    triggerRef.current?.focus();
  }

  function choose(node: CatalogCategoryNode | null) {
    onSelect(node);
    if (sheetOpen) closeSheet();
  }

  const tree = (
    <CategoryTree
      nodes={nodes}
      selectedId={selectedId}
      resetLabel={words.reset}
      onChoose={choose}
    />
  );

  return (
    <>
      {/* ── Телефон и планшет: кнопка ───────────────────────────────── */}
      <div className="lg:hidden">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold"
        >
          <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden />
          {selectedName ?? words.trigger}
        </button>
      </div>

      {/* ── ПК: постоянная колонка ──────────────────────────────────── */}
      <nav
        aria-label={words.heading}
        className="hidden lg:sticky lg:top-24 lg:block"
      >
        <p className="px-3 text-xs font-bold tracking-wide text-muted-foreground uppercase">
          {words.heading}
        </p>
        <div className="mt-2">{tree}</div>
      </nav>

      {/* ── Шторка ──────────────────────────────────────────────────── */}
      {sheetOpen ? (
        <>
          {/*
           * z-index выше 50: нижняя навигация в AppShell стоит на z-50,
           * и без этого шторка уезжала бы под неё.
           */}
          <div
            className="fixed inset-0 z-[55] bg-black/40 lg:hidden"
            onClick={closeSheet}
            aria-hidden
          />
          <div
            id={sheetId}
            role="dialog"
            aria-modal="true"
            aria-label={words.heading}
            className="fixed inset-x-0 bottom-0 z-[60] max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card lg:hidden"
            style={{
              boxShadow: "var(--shadow-nav)",
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
              <p className="text-sm font-bold">{words.heading}</p>
              <button
                ref={closeRef}
                type="button"
                onClick={closeSheet}
                aria-label="Закрыть"
                className="grid size-11 place-items-center rounded-xl text-muted-foreground"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="p-3">{tree}</div>
          </div>
        </>
      ) : null}
    </>
  );
}

function CategoryTree({
  nodes,
  selectedId,
  resetLabel,
  onChoose,
}: {
  nodes: CatalogCategoryNode[];
  selectedId: string | null;
  resetLabel: string;
  onChoose: (node: CatalogCategoryNode | null) => void;
}) {
  return (
    <ul>
      <li>
        <Row
          label={resetLabel}
          active={!selectedId}
          onClick={() => onChoose(null)}
        />
      </li>
      {nodes.map((node) => (
        <li key={node.id} className="mt-0.5">
          <Row
            label={node.name}
            active={selectedId === node.id}
            onClick={() => onChoose(node)}
          />
          {node.children.length > 0 ? (
            <ul>
              {node.children.map((child) => (
                <li key={child.id} className="mt-0.5">
                  <Row
                    label={child.name}
                    active={selectedId === child.id}
                    onClick={() => onChoose(child)}
                    nested
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Row({
  label,
  active,
  onClick,
  nested = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  nested?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Состояние передаётся не только цветом: раньше выбранную категорию
      // можно было отличить исключительно по заливке, то есть для
      // скринридера фильтра не существовало.
      aria-pressed={active}
      className={cn(
        "flex min-h-11 w-full items-center rounded-lg py-2 text-left text-sm transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        // Отступ у вложенного уровня — вместе с более лёгким шрифтом это
        // и есть признак уровня.
        nested ? "ps-7 pe-3 font-normal" : "px-3 font-semibold",
        active
          ? "bg-primary-soft text-primary"
          : "text-foreground hover:bg-secondary/70",
      )}
    >
      <span className="line-clamp-2">{label}</span>
    </button>
  );
}

function findName(
  nodes: CatalogCategoryNode[],
  id: string | null,
): string | null {
  if (!id) return null;
  for (const node of nodes) {
    if (node.id === id) return node.name;
    const nested = findName(node.children, id);
    if (nested) return nested;
  }
  return null;
}
