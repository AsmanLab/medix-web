import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoryFilter } from "@/features/catalog/CategoryFilter";
import type { CatalogCategoryNode } from "@/features/catalog/map-category";

/**
 * Фильтр категорий: разделы схлопнуты, выбор лежит внутри.
 *
 * Плоский список показывал все подкатегории сразу — при восьми разделах
 * по пять штук это сорок строк, и до нижних приходилось листать.
 */

function node(
  id: string,
  name: string,
  children: CatalogCategoryNode[] = [],
): CatalogCategoryNode {
  return { id, name, slug: id, children } as CatalogCategoryNode;
}

const TREE: CatalogCategoryNode[] = [
  node("lab", "Лабораторное оборудование", [
    node("urine", "Анализаторы мочи"),
    node("coag", "Коагулометры"),
  ]),
  node("vet", "Ветеринария", [node("hema", "Гематологические анализаторы")]),
  // Раздел без подкатегорий: раскрывать нечего.
  node("reagents", "Реагенты для КДЛ"),
];

afterEach(cleanup);

/** Колонка на ПК и шторка на телефоне рисуют одно дерево — берём колонку. */
function renderFilter(selectedId: string | null, onSelect = vi.fn()) {
  render(
    <CategoryFilter
      nodes={TREE}
      selectedId={selectedId}
      onSelect={onSelect}
      kind="category"
    />,
  );
  return { onSelect, nav: screen.getByRole("navigation", { name: "Категории" }) };
}

describe("CategoryFilter", () => {
  it("по умолчанию показывает только заголовки разделов", () => {
    const { nav } = renderFilter(null);

    expect(nav.textContent).toContain("Лабораторное оборудование");
    // Подкатегории свёрнуты — Radix не держит их содержимое в доступном дереве.
    expect(
      screen.queryByRole("button", { name: "Коагулометры" }),
    ).toBeNull();
  });

  it("раскрывает раздел по нажатию на заголовок", () => {
    renderFilter(null);
    const header = screen.getAllByRole("button", {
      name: "Лабораторное оборудование",
    })[0];

    expect(header.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(header);

    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("button", { name: "Коагулометры" })[0]).toBeTruthy();
  });

  it("заголовок раскрывает, но не выбирает раздел", () => {
    // Два действия на одном элементе — частый источник «нажал не туда»:
    // выбор самого раздела лежит первой строкой внутри.
    const { onSelect } = renderFilter(null);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Лабораторное оборудование" })[0],
    );

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("«Все товары раздела» выбирает сам раздел", () => {
    const { onSelect } = renderFilter(null);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Лабораторное оборудование" })[0],
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Все товары раздела" })[0]);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "lab" }),
    );
  });

  it("раздел с выбранной подкатегорией раскрыт сразу", () => {
    // Иначе после перезагрузки страницы фильтр выглядит сброшенным,
    // хотя он применён.
    renderFilter("coag");

    const header = screen.getAllByRole("button", {
      name: "Лабораторное оборудование",
    })[0];
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("button", { name: "Коагулометры" })[0]).toBeTruthy();
  });

  it("раздел без подкатегорий остаётся обычной строкой выбора", () => {
    const { onSelect } = renderFilter(null);

    const row = screen.getAllByRole("button", { name: "Реагенты для КДЛ" })[0];
    expect(row.getAttribute("aria-expanded")).toBeNull();

    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "reagents" }),
    );
  });

  it("сброс фильтра отдаёт null", () => {
    const { onSelect } = renderFilter("coag");

    fireEvent.click(screen.getAllByRole("button", { name: "Все товары" })[0]);

    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
