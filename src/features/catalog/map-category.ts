import type { CategoryOut } from "@/api/catalog";

export type CatalogCategoryNode = {
  id: string;
  slug: string;
  name: string;
  sort: number;
  imageKey: string;
  children: CatalogCategoryNode[];
};

export function buildCategoryTree(
  categories: CategoryOut[],
): CatalogCategoryNode[] {
  const active = categories.filter((c) => c.is_active);
  const byParent = new Map<string | null, CategoryOut[]>();

  for (const category of active) {
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
      children: build(node.id),
    }));
  }

  return build(null);
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
