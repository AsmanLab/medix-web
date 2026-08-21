import { describe, expect, it } from "vitest";
import type { CategoryOut } from "@/api/catalog";
import {
  buildAdminCategoryTree,
  buildCategoryTree,
  collectCategoryIds,
  findCategoryNode,
  findCategoryPath,
  flattenCategoryTree,
} from "./map-category";

function category(
  id: string,
  name: string,
  slug: string,
  parent: string | null,
  extra: Partial<CategoryOut> = {},
): CategoryOut {
  return {
    id,
    name_ru: name,
    name_en: "",
    slug,
    parent_id: parent,
    sort: 0,
    is_active: true,
    image_key: "",
    seo_title: "",
    seo_description: "",
    product_count: 0,
    ...extra,
  } as CategoryOut;
}

/** Дерево заказчика: Лаборатория → ГЕМАТОЛОГИЯ → Гематологические анализаторы. */
const sample: CategoryOut[] = [
  category("root-1", "Диагностика", "diagnostic", null, {
    sort: 1,
    product_count: 7,
  }),
  category("child-1", "УЗИ", "ultrasound", "root-1", { product_count: 3 }),
  category("lab", "Лаборатория", "lab", null, { sort: 2, product_count: 5 }),
  category("hema", "ГЕМАТОЛОГИЯ", "hematology", "lab", { product_count: 5 }),
  category("hema-analyzers", "Гематологические анализаторы", "hema-an", "hema", {
    product_count: 4,
  }),
  category("hema-reagents", "Реагенты для гематологии", "hema-re", "hema", {
    sort: 1,
    product_count: 1,
  }),
  category("inactive", "Скрытая", "hidden", null, { is_active: false }),
];

describe("buildCategoryTree", () => {
  it("собирает три уровня и пропускает скрытые", () => {
    const tree = buildCategoryTree(sample);

    const lab = tree.find((n) => n.slug === "lab")!;
    expect(lab.children).toHaveLength(1);
    expect(lab.children[0]?.slug).toBe("hematology");
    expect(lab.children[0]?.children.map((n) => n.slug)).toEqual([
      "hema-an",
      "hema-re",
    ]);
    expect(tree.map((n) => n.slug)).not.toContain("hidden");
  });

  it("проставляет уровень: корень — 1", () => {
    const tree = buildCategoryTree(sample);
    const lab = tree.find((n) => n.slug === "lab")!;

    expect(lab.depth).toBe(1);
    expect(lab.children[0]?.depth).toBe(2);
    expect(lab.children[0]?.children[0]?.depth).toBe(3);
  });

  it("поднимает подкатегорию скрытого раздела в корень", () => {
    // Витрина получает дерево без скрытых категорий. Если считать
    // родителя по `parent_id` вслепую, такая ветка исчезнет с витрины
    // целиком — вместе со всеми своими товарами.
    const withHiddenParent = sample.map((c) =>
      c.id === "lab" ? { ...c, is_active: false } : c,
    );

    const tree = buildCategoryTree(withHiddenParent);

    const hema = tree.find((n) => n.slug === "hematology");
    expect(hema).toBeDefined();
    expect(hema?.depth).toBe(1);
    expect(hema?.children).toHaveLength(2);
  });

  it("не уходит в бесконечность на кольце в данных", () => {
    // Бэкенд теперь отбивает такое на записи, но кольцо могло остаться
    // в базе с прежних времён, а последствие здесь — белый экран.
    const ring: CategoryOut[] = [
      category("a", "A", "a", "b"),
      category("b", "B", "b", "a"),
      category("ok", "Обычная", "ok", null),
    ];

    const tree = buildCategoryTree(ring);

    expect(tree.map((n) => n.slug)).toContain("ok");
  });
});

describe("productCount", () => {
  it("переносит число товаров из ответа API", () => {
    const tree = buildCategoryTree(sample);
    expect(tree[0]?.productCount).toBe(7);
    expect(tree[0]?.children[0]?.productCount).toBe(3);
  });

  it("даёт null, если API числа не прислал", () => {
    // Витрина может уехать раньше бэкенда: поле добавочное. Ноль на его
    // месте читался бы как пустая категория, поэтому именно null —
    // счётчик тогда не рисуется вовсе.
    const withoutCounts = sample.map(
      ({ product_count: _ignored, ...rest }) => rest as CategoryOut,
    );

    const tree = buildCategoryTree(withoutCounts);

    expect(tree[0]?.productCount).toBeNull();
  });
});

describe("buildAdminCategoryTree", () => {
  it("includes inactive roots", () => {
    const tree = buildAdminCategoryTree(sample);
    expect(tree.map((n) => n.slug).sort()).toEqual([
      "diagnostic",
      "hidden",
      "lab",
    ]);
  });
});

describe("findCategoryPath", () => {
  it("отдаёт путь от корня до третьего уровня", () => {
    const tree = buildCategoryTree(sample);

    expect(findCategoryPath(tree, "hema-an")?.map((n) => n.slug)).toEqual([
      "lab",
      "hematology",
      "hema-an",
    ]);
  });

  it("находит и по id, и по slug", () => {
    const tree = buildCategoryTree(sample);

    expect(findCategoryPath(tree, "hema-analyzers")?.at(-1)?.slug).toBe(
      "hema-an",
    );
  });

  it("на корне путь из одного узла", () => {
    const tree = buildCategoryTree(sample);
    expect(findCategoryPath(tree, "diagnostic")).toHaveLength(1);
  });

  it("даёт null для чужого slug", () => {
    expect(findCategoryPath(buildCategoryTree(sample), "нет-такого")).toBeNull();
  });
});

describe("findCategoryNode", () => {
  it("достаёт узел третьего уровня", () => {
    const tree = buildCategoryTree(sample);
    expect(findCategoryNode(tree, "hema-an")?.name).toBe(
      "Гематологические анализаторы",
    );
  });
});

describe("collectCategoryIds", () => {
  it("включает себя и всех потомков на трёх уровнях", () => {
    const tree = buildCategoryTree(sample);
    const lab = tree.find((n) => n.slug === "lab")!;

    // Товары висят на листьях: без внуков выдача раздела была бы пустой.
    expect(collectCategoryIds(lab).sort()).toEqual(
      ["hema", "hema-analyzers", "hema-reagents", "lab"].sort(),
    );
  });
});

describe("flattenCategoryTree", () => {
  it("разворачивает дерево в порядке обхода", () => {
    const tree = buildCategoryTree(sample);

    expect(flattenCategoryTree(tree).map((n) => n.slug)).toEqual([
      "diagnostic",
      "ultrasound",
      "lab",
      "hematology",
      "hema-an",
      "hema-re",
    ]);
  });
});
