import type { CategoryOut } from "@/api/catalog";

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
  children: CatalogCategoryNode[];
};

function buildTreeFromList(categories: CategoryOut[]): CatalogCategoryNode[] {
  const byParent = new Map<string | null, CategoryOut[]>();

  for (const category of categories) {
    const key = category.parent_id;
    const list = byParent.get(key) ?? [];
    list.push(category);
    byParent.set(key, list);
  }

  const sortFn = (a: CategoryOut, b: CategoryOut) =>
    a.sort - b.sort || a.name_ru.localeCompare(b.name_ru, "ru");

  function build(parentId: string | null): CatalogCategoryNode[] {
    const nodes = (byParent.get(parentId) ?? []).slice().sort(sortFn);
    return nodes.map((node) => ({
      id: node.id,
      slug: node.slug,
      name: node.name_ru,
      sort: node.sort,
      imageKey: node.image_key || "",
      isActive: node.is_active,
      seoTitle: node.seo_title || "",
      seoDescription: node.seo_description || "",
      children: build(node.id),
    }));
  }

  return build(null);
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

export function findCategoryNode(
  roots: CatalogCategoryNode[],
  slugOrId: string,
): { node: CatalogCategoryNode; parent: CatalogCategoryNode | null } | null {
  for (const root of roots) {
    if (root.id === slugOrId || root.slug === slugOrId) {
      return { node: root, parent: null };
    }
    const nested = findCategoryNode(root.children, slugOrId);
    if (nested) {
      return {
        node: nested.node,
        parent: nested.parent ?? root,
      };
    }
  }
  return null;
}

/** Category id + all descendant ids (for product listing under a section). */
export function collectCategoryIds(node: CatalogCategoryNode): string[] {
  return [node.id, ...node.children.flatMap(collectCategoryIds)];
}
