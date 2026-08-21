import type { CategoryOut } from "@/api/catalog";
import { contentText } from "@/i18n/content";

/**
 * Сколько уровней допускает дерево категорий.
 *
 * Настоящий предел стоит на бэкенде (`MAX_CATEGORY_DEPTH` в
 * `use_cases.py`) — он и отбивает запись с 422. Здесь копия, и она нужна
 * ровно для одного: не показывать в админке варианты, на которых человек
 * получит отказ уже после нажатия «Сохранить».
 *
 * Если предел поднимут — поменять надо оба числа. Расхождение не опасно:
 * витрина от него не сломается, просто выпадашка станет строже или мягче
 * сервера.
 */
export const MAX_CATEGORY_DEPTH = 3;

/**
 * Дерево категорий для витрины и админки.
 *
 * Уровней три: «Лаборатория → Гематология → Гематологические анализаторы».
 * Ни одна функция в этом файле числа уровней не знает — обход везде
 * рекурсивный, и четвёртый уровень (если заказчик его когда-нибудь
 * попросит) потребует правки только предела на бэкенде и вёрстки отступов.
 * Прежняя версия этого файла считала «родитель — ребёнок» и внуков теряла
 * молча: они просто не рисовались.
 */
export type CatalogCategoryNode = {
  id: string;
  slug: string;
  name: string;
  sort: number;
  imageKey: string;
  isActive: boolean;
  /** Заполняется в админке; до сих пор в разметку страницы не попадало. */
  seoTitle: string;
  seoDescription: string;
  /**
   * Уровень в дереве, корень — 1.
   *
   * Считается при сборке, а не берётся из ответа API: витрина получает
   * дерево без скрытых категорий, и ребёнок скрытого раздела приходит без
   * родителя. Уровень должен совпадать с тем, как узел выглядит здесь,
   * иначе отступ разъедется с отрисовкой.
   */
  depth: number;
  parentId: string | null;
  /**
   * Сколько товаров покажет выдача по этой категории — вместе
   * с подкатегориями, так их и листает раздел витрины.
   *
   * `null`, если API числа не прислал: поле добавочное, и витрина может
   * уехать раньше бэкенда. Тогда счётчиков просто нет — вместо нулей,
   * которые читались бы как «пустая категория».
   */
  productCount: number | null;
  children: CatalogCategoryNode[];
};

function buildTreeFromList(categories: CategoryOut[]): CatalogCategoryNode[] {
  const byParent = new Map<string | null, CategoryOut[]>();
  const known = new Set(categories.map((c) => c.id));

  for (const category of categories) {
    // Родителя, которого нет в списке, считаем отсутствующим: иначе
    // подкатегория скрытого раздела пропала бы с витрины вместе со своими
    // товарами. То же правило действует и в счётчике на бэкенде.
    const key =
      category.parent_id && known.has(category.parent_id)
        ? category.parent_id
        : null;
    const list = byParent.get(key) ?? [];
    list.push(category);
    byParent.set(key, list);
  }

  // Сортировка по показываемому имени, а не по русскому: на другом языке
  // алфавитный порядок был бы чужим.
  const sortFn = (a: CategoryOut, b: CategoryOut) =>
    a.sort - b.sort ||
    contentText(a.name, a.name_ru).localeCompare(contentText(b.name, b.name_ru));

  // `seen` — защита от кольца в данных (A → B → A). Бэкенд такое теперь
  // отбивает на записи, но кольцо могло остаться в базе с прежних времён,
  // а последствие здесь — переполнение стека, то есть белый экран.
  function build(
    parentId: string | null,
    depth: number,
    seen: ReadonlySet<string>,
  ): CatalogCategoryNode[] {
    const nodes = (byParent.get(parentId) ?? [])
      .filter((node) => !seen.has(node.id))
      .slice()
      .sort(sortFn);

    return nodes.map((node) => ({
      id: node.id,
      slug: node.slug,
      name: contentText(node.name, node.name_ru),
      sort: node.sort,
      imageKey: node.image_key || "",
      isActive: node.is_active,
      seoTitle: node.seo_title || "",
      seoDescription: node.seo_description || "",
      depth,
      parentId,
      // Проверка типа, а не `?? null`: в схеме поле обязательное (у него
      // есть значение по умолчанию), поэтому TypeScript считает его числом,
      // а старый бэкенд его просто не пришлёт.
      productCount:
        typeof node.product_count === "number" ? node.product_count : null,
      children: build(node.id, depth + 1, new Set(seen).add(node.id)),
    }));
  }

  return build(null, 1, new Set());
}

/** Storefront tree: active categories only. */
export function buildCategoryTree(
  categories: CategoryOut[],
): CatalogCategoryNode[] {
  return buildTreeFromList(categories.filter((c) => c.is_active));
}

/** Admin tree: includes hidden categories. */
export function buildAdminCategoryTree(
  categories: CategoryOut[],
): CatalogCategoryNode[] {
  return buildTreeFromList(categories);
}

/**
 * Путь от корня до узла включительно: `[Лаборатория, Гематология,
 * Гематологические анализаторы]`.
 *
 * Заменил прежний `findCategoryNode`, который отдавал только пару
 * «узел + родитель». Пары хватало ровно на два уровня: на третьем корень
 * из хлебных крошек выпадал, а страница раздела принимала за раздел
 * середину ветки.
 */
export function findCategoryPath(
  roots: CatalogCategoryNode[],
  slugOrId: string,
): CatalogCategoryNode[] | null {
  for (const node of roots) {
    if (node.id === slugOrId || node.slug === slugOrId) return [node];
    const nested = findCategoryPath(node.children, slugOrId);
    if (nested) return [node, ...nested];
  }
  return null;
}

/** Узел по slug или id — без пути, когда путь не нужен. */
export function findCategoryNode(
  roots: CatalogCategoryNode[],
  slugOrId: string,
): CatalogCategoryNode | null {
  return findCategoryPath(roots, slugOrId)?.at(-1) ?? null;
}

/** Category id + all descendant ids (for product listing under a section). */
export function collectCategoryIds(node: CatalogCategoryNode): string[] {
  return [node.id, ...node.children.flatMap(collectCategoryIds)];
}

/**
 * Сколько уровней занимает узел вместе с потомками: лист — 1.
 *
 * Нужно при выборе родителя: раздел с подкатегориями сам на третий уровень
 * встаёт, а его дети оказались бы четвёртым — и запись отобьётся.
 */
export function subtreeHeight(node: CatalogCategoryNode): number {
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(subtreeHeight));
}

/** Плоский список ветки — для выпадашек, где дерево рисуется отступами. */
export function flattenCategoryTree(
  nodes: CatalogCategoryNode[],
): CatalogCategoryNode[] {
  return nodes.flatMap((node) => [node, ...flattenCategoryTree(node.children)]);
}
