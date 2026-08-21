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

describe("CategoryFilter: три уровня", () => {
  /** Дерево заказчика: Лаборатория → ГЕМАТОЛОГИЯ → анализаторы и реагенты. */
  const DEEP: CatalogCategoryNode[] = [
    node("lab", "Лаборатория", [
      node("hema", "ГЕМАТОЛОГИЯ", [
        node("analyzers", "Гематологические анализаторы"),
        node("reagents", "Реагенты для гематологии"),
      ]),
      node("bio", "БИОХИМИЯ"),
    ]),
  ];

  function renderDeep(selectedId: string | null) {
    const onSelect = vi.fn();
    render(
      <CategoryFilter
        nodes={DEEP}
        selectedId={selectedId}
        onSelect={onSelect}
        kind="category"
      />,
    );
    return onSelect;
  }

  it("третий уровень раскрывается вторым нажатием", () => {
    // Прежняя версия знала только про два уровня и внуков теряла молча:
    // они лежали в дереве, но в разметку не попадали вовсе.
    renderDeep(null);

    fireEvent.click(screen.getAllByRole("button", { name: "Лаборатория" })[0]);
    const middle = screen.getAllByRole("button", { name: "ГЕМАТОЛОГИЯ" })[0];
    expect(middle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(middle);

    expect(
      screen.getAllByRole("button", {
        name: "Гематологические анализаторы",
      })[0],
    ).toBeTruthy();
  });

  it("выбор третьего уровня отдаёт сам узел", () => {
    const onSelect = renderDeep(null);

    fireEvent.click(screen.getAllByRole("button", { name: "Лаборатория" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "ГЕМАТОЛОГИЯ" })[0]);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Гематологические анализаторы",
      })[0],
    );

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "analyzers" }),
    );
  });

  it("обе ветки над выбранным узлом раскрыты сразу", () => {
    // Иначе, придя по ссылке на категорию третьего уровня, человек видит
    // фильтр полностью свёрнутым — как будто он не применён.
    renderDeep("analyzers");

    expect(
      screen
        .getAllByRole("button", { name: "Лаборатория" })[0]
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(
      screen
        .getAllByRole("button", { name: "ГЕМАТОЛОГИЯ" })[0]
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(
      screen.getAllByRole("button", {
        name: "Гематологические анализаторы",
      })[0],
    ).toBeTruthy();
  });

  it("подраздел без своих детей остаётся строкой выбора", () => {
    const onSelect = renderDeep(null);

    fireEvent.click(screen.getAllByRole("button", { name: "Лаборатория" })[0]);
    const leaf = screen.getAllByRole("button", { name: "БИОХИМИЯ" })[0];

    expect(leaf.getAttribute("aria-expanded")).toBeNull();
    fireEvent.click(leaf);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "bio" }),
    );
  });
});

describe("CategoryFilter: числа товаров", () => {
  const COUNTED: CatalogCategoryNode[] = [
    {
      ...node("lab", "Лабораторное оборудование", [
        { ...node("coag", "Коагулометры"), productCount: 3 },
        { ...node("urine", "Анализаторы мочи"), productCount: 0 },
      ]),
      // Раздел считается вместе с подкатегориями, поэтому его число больше
      // суммы показанных строк не бывает, но и меньше — тоже.
      productCount: 4,
    },
    { ...node("reagents", "Реагенты для КДЛ"), productCount: 1 },
  ];

  function renderCounted(resetCount: number | null = null) {
    render(
      <CategoryFilter
        nodes={COUNTED}
        selectedId={null}
        onSelect={vi.fn()}
        kind="category"
        resetCount={resetCount}
      />,
    );
  }

  it("число раздела включает подкатегории и озвучивается словами", () => {
    renderCounted();

    const header = screen.getAllByRole("button", {
      name: /Лабораторное оборудование/,
    })[0];
    expect(header.textContent).toContain("4");
    // Для скринридера «4» рядом с названием прочиталось бы как часть
    // названия — поэтому число продублировано словами.
    expect(header).toHaveAccessibleName("Лабораторное оборудование, 4 товара");
  });

  it("у подкатегорий свои числа, включая ноль", () => {
    renderCounted();
    fireEvent.click(
      screen.getAllByRole("button", { name: /Лабораторное оборудование/ })[0],
    );

    expect(
      screen.getAllByRole("button", { name: /Коагулометры/ })[0],
    ).toHaveAccessibleName("Коагулометры, 3 товара");
    expect(
      screen.getAllByRole("button", { name: /Анализаторы мочи/ })[0],
    ).toHaveAccessibleName("Анализаторы мочи, 0 товаров");
  });

  it("«Все товары раздела» число не повторяет", () => {
    // Оно уже стоит в заголовке строкой выше и означает то же самое.
    renderCounted();
    fireEvent.click(
      screen.getAllByRole("button", { name: /Лабораторное оборудование/ })[0],
    );

    expect(
      screen.getAllByRole("button", { name: "Все товары раздела" })[0],
    ).toHaveAccessibleName("Все товары раздела");
  });

  it("строка сброса показывает число, только если его передали", () => {
    renderCounted(9);

    expect(
      screen.getAllByRole("button", { name: /Все товары/ })[0],
    ).toHaveAccessibleName("Все товары, 9 товаров");

    cleanup();
    renderCounted(null);

    expect(
      screen.getAllByRole("button", { name: "Все товары" })[0],
    ).toHaveAccessibleName("Все товары");
  });

  it("без чисел от API счётчиков нет вовсе", () => {
    // Ноль на их месте читался бы как пустой каталог — а это всего лишь
    // витрина, уехавшая раньше бэкенда.
    render(
      <CategoryFilter
        nodes={TREE}
        selectedId={null}
        onSelect={vi.fn()}
        kind="category"
      />,
    );

    expect(
      screen.getAllByRole("button", { name: "Реагенты для КДЛ" })[0],
    ).toHaveAccessibleName("Реагенты для КДЛ");
  });
});
