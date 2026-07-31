import { describe, expect, test } from "vitest";
import { parseOptionPrice } from "@/api/catalog-options";

describe("parseOptionPrice", () => {
  test("пустое поле — это «по запросу», а не ноль", () => {
    // Опция без цены переводит сделку в RFQ, нулевая — оставляет заказом,
    // поэтому подменять одно другим нельзя.
    expect(parseOptionPrice("")).toBeNull();
    expect(parseOptionPrice("   ")).toBeNull();
    expect(parseOptionPrice("0")).toBe(0);
  });

  test("принимает запятую как разделитель", () => {
    expect(parseOptionPrice("1500,50")).toBe(1500.5);
    expect(parseOptionPrice("1500.50")).toBe(1500.5);
  });

  test("нечисловой и отрицательный ввод отбраковывается", () => {
    expect(parseOptionPrice("по запросу")).toBeUndefined();
    expect(parseOptionPrice("-100")).toBeUndefined();
    expect(parseOptionPrice("12abc")).toBeUndefined();
  });
});
