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
