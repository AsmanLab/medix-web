import { describe, expect, it } from "vitest";
import type { CategoryOut } from "@/api/catalog";
import {
  buildAdminCategoryTree,
  buildCategoryTree,
  collectCategoryIds,
  findCategoryNode,
} from "./map-category";

const sample: CategoryOut[] = [
  {
    id: "root-1",
    name_ru: "Диагностика",
    name_en: "Diagnostic",
    slug: "diagnostic",
    parent_id: null,
    sort: 1,
    is_active: true,
    image_key: "",
    seo_title: "",
    seo_description: "",
    product_count: 7,
  },
  {
    id: "child-1",
    name_ru: "УЗИ",
    name_en: "Ultrasound",
    slug: "ultrasound",
    parent_id: "root-1",
    sort: 0,
    is_active: true,
    image_key: "",
    seo_title: "",
    seo_description: "",
    product_count: 3,
  },
  {
    id: "inactive",
    name_ru: "Скрытая",
    name_en: "Hidden",
    slug: "hidden",
    parent_id: null,
    sort: 0,
    is_active: false,
    image_key: "",
    seo_title: "",
    seo_description: "",
    product_count: 0,
  },
];

describe("buildCategoryTree", () => {
  it("builds root → child tree and skips inactive", () => {
    const tree = buildCategoryTree(sample);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.slug).toBe("diagnostic");
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.slug).toBe("ultrasound");
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
    expect(tree.map((n) => n.slug).sort()).toEqual(["diagnostic", "hidden"]);
  });
});

describe("findCategoryNode", () => {
  it("resolves by slug at root and child", () => {
    const tree = buildCategoryTree(sample);
    expect(findCategoryNode(tree, "diagnostic")?.parent).toBeNull();
    expect(findCategoryNode(tree, "ultrasound")?.parent?.slug).toBe(
      "diagnostic",
    );
  });
});

describe("collectCategoryIds", () => {
  it("includes self and descendants", () => {
    const tree = buildCategoryTree(sample);
    expect(collectCategoryIds(tree[0]!)).toEqual(["root-1", "child-1"]);
  });
});
