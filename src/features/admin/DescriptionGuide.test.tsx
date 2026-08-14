import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DescriptionPreview } from "@/features/admin/DescriptionGuide";

/**
 * Предпросмотр описания в админке.
 *
 * Характеристики на карточке товара получаются разбором текста описания,
 * но в редакторе это было одно безликое поле: админ не видел, что станет
 * характеристикой, а что останется абзацем.
 */

const TEXT = `Автоматический анализатор для лабораторий.

Производитель: Mindray
Вес: 45 кг`;

afterEach(cleanup);

describe("DescriptionPreview", () => {
  it("shows what the storefront will render", () => {
    render(<DescriptionPreview text={TEXT} />);

    expect(screen.getByText("Производитель")).toBeTruthy();
    expect(screen.getByText("Mindray")).toBeTruthy();
    expect(screen.getByText("Вес")).toBeTruthy();
    expect(screen.getByText("45 кг")).toBeTruthy();
  });

  it("counts the recognised specs", () => {
    render(<DescriptionPreview text={TEXT} />);
    expect(screen.getByText("характеристик распознано: 2")).toBeTruthy();
  });

  it("says plainly when nothing was recognised as a spec", () => {
    render(<DescriptionPreview text="Просто абзац без характеристик." />);
    expect(screen.getByText("характеристики не распознаны")).toBeTruthy();
  });

  it("warns that an empty description leaves no block on the card", () => {
    render(<DescriptionPreview text="   " />);
    expect(
      screen.getByText(/Описание пустое — на карточке товара блока не будет/),
    ).toBeTruthy();
  });
});
