import { describe, expect, test } from "vitest";
import { parseDescription } from "@/features/catalog/product-description";

describe("parseDescription", () => {
  test("пустое описание не даёт блоков", () => {
    expect(parseDescription("")).toEqual([]);
    expect(parseDescription(null)).toEqual([]);
    expect(parseDescription("   \n  ")).toEqual([]);
  });

  test("абзацы разделяются пустой строкой", () => {
    const blocks = parseDescription("Первый абзац.\n\nВторой абзац.");
    expect(blocks).toEqual([
      { kind: "paragraph", text: "Первый абзац." },
      { kind: "paragraph", text: "Второй абзац." },
    ]);
  });

  test("соседние строки одного абзаца склеиваются", () => {
    const blocks = parseDescription("Звуковое оповещение о начале.\nБыстрое начало анализа.");
    expect(blocks).toEqual([
      {
        kind: "paragraph",
        text: "Звуковое оповещение о начале. Быстрое начало анализа.",
      },
    ]);
  });

  test("«Ключ: значение» становится характеристикой", () => {
    const blocks = parseDescription(
      "Производительность: 120 анализов в час\nПамять: 1000 результатов",
    );
    expect(blocks).toEqual([
      {
        kind: "specs",
        rows: [
          { label: "Производительность", value: "120 анализов в час" },
          { label: "Память", value: "1000 результатов" },
        ],
      },
    ]);
  });

  test("длинный текст с двоеточием остаётся абзацем", () => {
    // Иначе вступление превратилось бы в характеристику с абзацем вместо значения.
    const long =
      "Важно: " + "этот прибор предназначен для лабораторий ".repeat(6);
    const blocks = parseDescription(long);
    expect(blocks[0].kind).toBe("paragraph");
  });

  test("маркированный список собирается в один блок", () => {
    const blocks = parseDescription("• фотометрия\n• турбидиметрия\n• кинетика");
    expect(blocks).toEqual([
      { kind: "list", items: ["фотометрия", "турбидиметрия", "кинетика"] },
    ]);
  });

  test("короткая строка перед характеристиками — заголовок раздела", () => {
    const blocks = parseDescription("Образцы\nТипы проб: сыворотка, плазма");
    expect(blocks).toEqual([
      { kind: "heading", text: "Образцы" },
      { kind: "specs", rows: [{ label: "Типы проб", value: "сыворотка, плазма" }] },
    ]);
  });

  test("одинокая короткая строка остаётся абзацем", () => {
    // Заголовок без содержимого — это просто короткое предложение.
    expect(parseDescription("Комплектация")).toEqual([
      { kind: "paragraph", text: "Комплектация" },
    ]);
  });

  test("реальное описание разбирается по типам блоков", () => {
    const blocks = parseDescription(
      [
        "CL-50 Plus портативный анализатор мочи.",
        "",
        "Производительность: 120 анализов в час",
        "",
        "Методы расчета и измерений:",
        "• фотометрия",
        "• кинетика",
        "",
        "Память: 1000 результатов",
      ].join("\n"),
    );

    expect(blocks.map((b) => b.kind)).toEqual([
      "paragraph",
      "specs",
      "paragraph",
      "list",
      "specs",
    ]);
  });
});
