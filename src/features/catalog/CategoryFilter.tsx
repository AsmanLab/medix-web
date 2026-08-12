import { ChevronDown, Filter } from "lucide-react";
import { useId, useState } from "react";
import type { CatalogCategoryNode } from "@/features/catalog/map-category";
import { cn } from "@/lib/utils";

/**
 * Фильтр по категориям — один на каталог и на страницу раздела.
 *
 * Было две копии в route-файлах, и они разошлись ровно так же, как до этого
 * разошлись карточка товара и сетка: сброс назывался «Сбросить» в каталоге
 * и «Показать всё» в разделе, неактивная пилюля была `bg-background` с рамкой
 * против `bg-secondary` без. Одно действие выглядело и называлось по-разному
 * на соседних экранах.
 *
 * Поэтому формулировки живут здесь и выводятся из `kind`, а не приходят
 * пропсами: строку, которой нет в вызове, невозможно случайно разъехать.
 *
 * ### Почему всё пилюлями
 *
 * Раньше родительская категория была кнопкой во всю ширину с заливкой,
 * а дочерняя — маленькой пилюлей. Делали они одно и то же (ставили фильтр),
 * но широкая заливка читается как заголовок раздела, то есть «нажми, чтобы
 * раскрыть». Теперь тип контрола один, а вложенность передаётся отступом
 * и линией слева.
 *
 * ### Размеры
 *
 * `min-h-11` — это 44px, минимум по WCAG 2.5.5 и Apple HIG. Дочерние пилюли
 * были 24px, то есть половина нормы, и стояли с интервалом 8px: промах
 * попадал в соседнюю категорию и перезапускал загрузку товаров.
 */

type CategoryFilterProps = {
  /**
   * Верхний уровень списка. В каталоге это разделы со своими детьми,
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
    trigger: "Фильтр по категориям",
    selected: "Категория",
    reset: "Все категории",
    heading: "Категории",
  },
  subcategory: {
    trigger: "Фильтр по подкатегориям",
    selected: "Подкатегория",
    reset: "Все подкатегории",
    heading: "Подкатегории",
  },
} as const;

export function CategoryFilter({
  nodes,
  selectedId,
  onSelect,
  kind,
}: CategoryFilterProps) {
  const words = WORDING[kind];
  const panelId = useId();
  // Открыт сразу, если фильтр уже стоит: иначе непонятно, откуда взялось
  // сужение выдачи.
  const [open, setOpen] = useState(Boolean(selectedId));

  const selectedName = findName(nodes, selectedId);

  function choose(node: CatalogCategoryNode | null) {
    onSelect(node);
    // Закрываем после выбора. Раньше панель оставалась раскрытой, и на
    // телефоне после нажатия нужно было пролистать весь список категорий,
    // чтобы увидеть результат — действие и его результат не попадали
    // в один экран.
    setOpen(false);
  }

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <Filter className="h-4 w-4 text-primary" aria-hidden />
        {selectedName ? `${words.selected}: ${selectedName}` : words.trigger}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={panelId}
          className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
        >
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {words.heading}
          </p>

          <ul className="mt-3 space-y-3">
            <li>
              <Pill
                label={words.reset}
                active={!selectedId}
                onClick={() => choose(null)}
              />
            </li>

            {nodes.map((node) => (
              <li key={node.id}>
                <Pill
                  label={node.name}
                  active={selectedId === node.id}
                  onClick={() => choose(node)}
                />

                {node.children.length > 0 ? (
                  /*
                   * Вложенность — отступ плюс линия слева. Тип контрола
                   * тот же, поэтому уровень читается как уровень,
                   * а не как другой вид действия.
                   */
                  <ul className="mt-3 ms-4 flex flex-wrap gap-3 border-s border-border ps-4">
                    {node.children.map((child) => (
                      <li key={child.id}>
                        <Pill
                          label={child.name}
                          active={selectedId === child.id}
                          onClick={() => choose(child)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Состояние передаётся не только цветом: до этого выбранную категорию
      // можно было отличить исключительно по заливке, то есть для
      // скринридера фильтра не существовало.
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-background hover:border-primary/40 hover:bg-primary-soft",
      )}
    >
      {label}
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
