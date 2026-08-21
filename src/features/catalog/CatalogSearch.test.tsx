import { cleanup, fireEvent, screen } from "@testing-library/react";
import { renderWithProviders as render } from "@/test/render";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogSearch } from "@/features/catalog/CatalogSearch";

/**
 * Крестик очистки.
 *
 * Поиск применяется по кнопке, а живёт в адресной строке: очистить поле
 * руками было недостаточно — выдача оставалась отфильтрованной. Поэтому
 * крестик показывается и при пустом поле, если запрос ещё применён.
 */

afterEach(cleanup);

function renderSearch(
  props: Partial<React.ComponentProps<typeof CatalogSearch>> = {},
) {
  const onChange = vi.fn();
  const onClear = vi.fn();
  const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());

  render(
    <CatalogSearch
      id="search"
      label="Поиск товаров"
      placeholder="Поиск по названию или артикулу"
      value=""
      onChange={onChange}
      onClear={onClear}
      onSubmit={onSubmit}
      {...props}
    />,
  );

  return {
    onChange,
    onClear,
    onSubmit,
    // Не getByLabelText: та же подпись стоит и на самой форме (role="search"),
    // и поиск по подписи находит оба узла.
    input: screen.getByRole("textbox", { name: "Поиск товаров" }),
    clearButton: () => screen.queryByRole("button", { name: "Очистить поиск" }),
  };
}

describe("CatalogSearch", () => {
  it("не показывает крестик у пустого поля без применённого поиска", () => {
    const { clearButton } = renderSearch();

    expect(clearButton()).toBeNull();
  });

  it("показывает крестик, как только в поле появился текст", () => {
    const { clearButton } = renderSearch({ value: "узи" });

    expect(clearButton()).not.toBeNull();
  });

  it("показывает крестик при пустом поле, если выдача ещё отфильтрована", () => {
    // Ровно то состояние, из которого раньше не было выхода: человек стёр
    // текст руками, а товары всё ещё отобраны прошлым запросом.
    const { clearButton } = renderSearch({ value: "", appliedValue: "узи" });

    expect(clearButton()).not.toBeNull();
  });

  it("нажатие на крестик снимает поиск и возвращает фокус в поле", () => {
    const { onClear, clearButton, input } = renderSearch({ value: "узи" });

    fireEvent.click(clearButton()!);

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(input);
  });

  it("Escape в поле делает то же самое", () => {
    const { onClear, input } = renderSearch({ value: "узи" });

    fireEvent.keyDown(input, { key: "Escape" });

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("Escape в пустом поле не трогает выдачу", () => {
    // Иначе Escape перехватывался бы там, где снимать нечего, — а в шторке
    // фильтра эта же клавиша закрывает шторку.
    const { onClear, input } = renderSearch();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(onClear).not.toHaveBeenCalled();
  });

  it("отправляет форму по кнопке «Найти»", () => {
    const { onSubmit } = renderSearch({ value: "узи" });

    fireEvent.click(screen.getByRole("button", { name: "Найти" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
