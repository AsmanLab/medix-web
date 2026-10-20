import { describe, expect, it } from "vitest";
import { findSitePage, navPagesFrom, SITE_PAGES } from "./site-pages";

describe("findSitePage", () => {
  it("finds a registered site page by slug", () => {
    expect(findSitePage("about")?.path).toBe("/about");
  });

  it("returns undefined for an unknown slug", () => {
    expect(findSitePage("warranty")).toBeUndefined();
  });
});

describe("navPagesFrom", () => {
  it("excludes slugs that already have their own hardcoded route", () => {
    const pages = [
      { slug: "about", title: "О компании" },
      { slug: "service", title: "Сервис" },
      { slug: "privacy", title: "Политика конфиденциальности" },
      { slug: "terms", title: "Условия" },
      { slug: "warranty", title: "Гарантия" },
    ];
    expect(navPagesFrom(pages).map((p) => p.slug)).toEqual(["warranty"]);
  });

  it("keeps every SITE_PAGES slug out of the result", () => {
    const pages = SITE_PAGES.map((p) => ({ slug: p.slug, title: p.title }));
    expect(navPagesFrom(pages)).toEqual([]);
  });
});
