import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { CatalogCategoryNode } from "@/features/catalog/map-category";
import { plural } from "@/lib/plural";
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
 *
 * ### Почему разделы схлопнуты
 *
 * Плоское дерево показывало все подкатегории сразу: восемь разделов по пять
 * штук — это сорок строк, и до нижних разделов приходилось листать, причём
 * в шторке на телефоне особенно долго. Теперь раздел раскрывается по нажатию,
 * а на экране видно оглавление целиком.
 *
 * Заголовок раздела **раскрывает** его, а не выбирает: два разных действия
 * на одном элементе — частый источник «нажал не туда». Выбор самого раздела
 * лежит первой строкой внутри («Все товары раздела»). Разделы без
 * подкатегорий остаются обычной строкой выбора — раскрывать там нечего.
 *
 * Раздел с выбранной подкатегорией раскрыт при первой отрисовке: иначе после
 * перезагрузки страницы фильтр выглядит сброшенным, хотя он применён.
 *
 * ### Три уровня
 *
 * Дерево заказчика — «Лаборатория → Гематология → Гематологические
 * анализаторы». Рисуется рекурсией, и правило одно на любой глубине: есть
 * дети — раскрывающийся заголовок, нет — строка выбора. Прежняя версия
 * знала ровно про два уровня и внуков **теряла молча**: они лежали
 * в дереве, но в разметку не попадали.
 *
 * Уровень читается по отступу и по насыщенности шрифта: раздел — жирный,
 * подраздел — средний, третий уровень — обычный. Шевроны при этом стоят
 * на своих отступах, то есть вложенность видно и в свёрнутом виде.
 *
 * ### Числа у категорий
 *
 * Число справа — сколько товаров покажет выдача по этой строке. У раздела
 * это он сам вместе с подкатегориями, потому что именно так его и листает
 * витрина. Число раздела не повторяется на строке «Все товары раздела»:
 * она стоит прямо под заголовком и означает ровно то же самое.
 *
 * Если API числа не прислал (витрина уехала раньше бэкенда), счётчиков нет
 * вовсе — нули на их месте читались бы как пустой каталог.
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
  /**
   * Число у строки сброса. Нужно странице раздела: там сброс — это «весь
   * раздел», и у него есть своё количество. В каталоге сброс означает весь
   * каталог, а его общего числа API не отдаёт, поэтому там счётчика нет.
   */
  resetCount?: number | null;
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
  resetCount = null,
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
      resetCount={resetCount}
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
          className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold active:bg-secondary"
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
            className="overlay-fade fixed inset-0 z-[55] bg-black/40 lg:hidden"
            onClick={closeSheet}
            aria-hidden
          />
          <div
            id={sheetId}
            role="dialog"
            aria-modal="true"
            aria-label={words.heading}
            className="sheet-rise fixed inset-x-0 bottom-0 z-[60] max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-card lg:hidden"
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
                className="grid size-11 touch-manipulation place-items-center rounded-xl text-muted-foreground active:bg-secondary"
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
  resetCount,
  onChoose,
}: {
  nodes: CatalogCategoryNode[];
  selectedId: string | null;
  resetLabel: string;
  resetCount: number | null;
  onChoose: (node: CatalogCategoryNode | null) => void;
}) {
  return (
    <div>
      <Row
        label={resetLabel}
        count={resetCount}
        active={!selectedId}
        onClick={() => onChoose(null)}
        level={0}
      />
      <Level
        nodes={nodes}
        selectedId={selectedId}
        onChoose={onChoose}
        level={0}
      />
    </div>
  );
}

/**
 * Один уровень дерева: сначала раскрывающиеся ветки, потом листья.
 *
 * Листья идут после аккордеона намеренно — иначе список раскрывающихся
 * заголовков разрывался бы обычными строками, и было бы неясно, где ещё
 * есть что раскрыть.
 */
function Level({
  nodes,
  selectedId,
  onChoose,
  level,
}: {
  nodes: CatalogCategoryNode[];
  selectedId: string | null;
  onChoose: (node: CatalogCategoryNode | null) => void;
  level: number;
}) {
  const branches = nodes.filter((node) => node.children.length > 0);
  const leaves = nodes.filter((node) => node.children.length === 0);

  // Раскрытой держим ветку с текущим выбором — на своём уровне. Значение
  // управляемое, а не начальное: выбор меняется и снаружи, из адресной
  // строки, когда человек пришёл по ссылке или нажал «Назад».
  const [openId, setOpenId] = useState<string>(
    () => branchIdFor(branches, selectedId) ?? "",
  );

  useEffect(() => {
    const next = branchIdFor(branches, selectedId);
    if (next) setOpenId(next);
  }, [branches, selectedId]);

  return (
    <>
      {branches.length > 0 ? (
        <Accordion
          type="single"
          collapsible
          value={openId}
          onValueChange={setOpenId}
        >
          {branches.map((node) => {
            const activeInside =
              selectedId === node.id || containsSelection(node, selectedId);

            return (
              <AccordionItem key={node.id} value={node.id}>
                <AccordionTrigger
                  className={cn(
                    activeInside && "text-primary",
                    indentFor(level),
                    weightFor(level),
                  )}
                  // Ветка с выбором внутри помечена не только цветом: без
                  // этого для скринридера все заголовки одинаковы.
                  aria-current={activeInside ? "true" : undefined}
                >
                  <span className="line-clamp-2 flex-1">{node.name}</span>
                  <Count value={node.productCount} />
                </AccordionTrigger>
                <AccordionContent>
                  {/* Не «Все: {название}» — заголовок ветки стоит прямо
                      над этой строкой, и повтор читался как вторая
                      категория с тем же именем. Числа здесь тоже нет: оно
                      уже стоит в заголовке строкой выше и означает ровно
                      это же. */}
                  <Row
                    label="Все товары раздела"
                    active={selectedId === node.id}
                    onClick={() => onChoose(node)}
                    level={level + 1}
                  />
                  <Level
                    nodes={node.children}
                    selectedId={selectedId}
                    onChoose={onChoose}
                    level={level + 1}
                  />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : null}

      {leaves.map((node) => (
        <Row
          key={node.id}
          label={node.name}
          count={node.productCount}
          active={selectedId === node.id}
          onClick={() => onChoose(node)}
          level={level}
        />
      ))}
    </>
  );
}

/**
 * Отступ и насыщенность по уровню.
 *
 * Массивы, а не арифметика в классе: Tailwind собирает CSS, разбирая
 * исходники строками, и `ps-${n}` в шаблоне не даёт никакого класса вовсе.
 * Ниже третьего уровня дерево не опускается (предел стоит на бэкенде),
 * поэтому последний элемент повторяется как запас — на случай, если предел
 * когда-нибудь поднимут раньше, чем поправят вёрстку.
 */
const INDENT = ["px-3", "ps-7 pe-3", "ps-11 pe-3", "ps-11 pe-3"] as const;
const WEIGHT = [
  "font-semibold",
  "font-medium",
  "font-normal",
  "font-normal",
] as const;

function indentFor(level: number): string {
  return INDENT[Math.min(level, INDENT.length - 1)]!;
}

function weightFor(level: number): string {
  return WEIGHT[Math.min(level, WEIGHT.length - 1)]!;
}

/** Лежит ли выбранный узел где-то в поддереве этой ветки. */
function containsSelection(
  node: CatalogCategoryNode,
  selectedId: string | null,
): boolean {
  if (!selectedId) return false;
  return node.children.some(
    (child) => child.id === selectedId || containsSelection(child, selectedId),
  );
}

/** Ветка, внутри которой лежит выбранный узел (или сама выбранная ветка). */
function branchIdFor(
  branches: CatalogCategoryNode[],
  selectedId: string | null,
): string | null {
  if (!selectedId) return null;
  const found = branches.find(
    (node) => node.id === selectedId || containsSelection(node, selectedId),
  );
  return found?.id ?? null;
}

/**
 * Число товаров у строки.
 *
 * Скрыто от скринридера и продублировано словами: «12» само по себе
 * прочиталось бы как часть названия категории.
 *
 * `null` — API числа не прислал (витрина уехала раньше бэкенда). Тогда
 * счётчика нет вовсе: ноль на этом месте читался бы как пустая категория.
 */
function Count({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  return (
    <>
      <span
        className="shrink-0 text-xs tabular-nums text-muted-foreground"
        aria-hidden
      >
        {value}
      </span>
      {/* Запятая не для красоты: подписи склеиваются без пробела, и без
          неё скринридер читает «Коагулометры3 товара». */}
      <span className="sr-only">
        {`, ${plural(value, "товар", "товара", "товаров")}`}
      </span>
    </>
  );
}

function Row({
  label,
  count = null,
  active,
  onClick,
  level,
}: {
  label: string;
  count?: number | null;
  active: boolean;
  onClick: () => void;
  level: number;
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
        "flex min-h-11 w-full items-center gap-2 rounded-lg py-2 text-left text-sm transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        // touch-action: manipulation убирает 300ms задержку тапа, которую
        // браузер держит на случай двойного нажатия для зума.
        "touch-manipulation",
        // Отступ — вместе с насыщенностью шрифта это и есть признак уровня.
        indentFor(level),
        weightFor(level),
        active
          ? "bg-primary-soft text-primary"
          : // active: нужен отдельно от hover: на тач-экране hover не
            // срабатывает вовсе, и до перерисовки списка нажатие оставалось
            // без отклика.
            "text-foreground hover:bg-secondary/70 active:bg-secondary",
      )}
    >
      <span className="line-clamp-2 flex-1">{label}</span>
      <Count value={count} />
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
