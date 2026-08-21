import { cleanup } from "@testing-library/react";
import { renderWithProviders as render } from "@/test/render";
import { afterEach, describe, expect, it } from "vitest";
import { usePageMeta, type PageMeta } from "@/lib/page-meta";

function Probe(props: PageMeta) {
  usePageMeta(props);
  return null;
}

function metaContent(selector: string): string | null {
  return document.head.querySelector(selector)?.getAttribute("content") ?? null;
}

afterEach(cleanup);

describe("usePageMeta", () => {
  it("добавляет название сайта к заголовку страницы", () => {
    render(<Probe title="Каталог" />);
    expect(document.title).toBe("Каталог — Medix International");
  });

  it("без заголовка оставляет одно название сайта", () => {
    render(<Probe />);
    expect(document.title).toBe("Medix International");
  });

  it("пишет описание в meta и og", () => {
    render(<Probe title="Контакты" description="Офисы и телефоны" />);

    expect(metaContent('meta[name="description"]')).toBe("Офисы и телефоны");
    expect(metaContent('meta[property="og:description"]')).toBe(
      "Офисы и телефоны",
    );
    expect(metaContent('meta[property="og:title"]')).toBe(
      "Контакты — Medix International",
    );
  });

  it("пустое описание подменяется общим", () => {
    // Пустой seo_description в админке — обычное дело; в разметку он попасть
    // не должен, иначе страница уходит в выдачу без описания вовсе.
    render(<Probe title="Товар" description="   " />);

    expect(metaContent('meta[name="description"]')).toContain(
      "Медицинское оборудование",
    );
  });

  it("возвращает прежний заголовок при уходе со страницы", () => {
    document.title = "Medix";
    const view = render(<Probe title="Корзина" />);
    expect(document.title).toBe("Корзина — Medix International");

    view.unmount();
    expect(document.title).toBe("Medix");
  });
});
