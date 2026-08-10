import { describe, expect, it } from "vitest";
import { plural, pluralForm } from "@/lib/plural";

describe("pluralForm", () => {
  const forms = ["позиция", "позиции", "позиций"] as const;
  const f = (n: number) => pluralForm(n, ...forms);

  it("единственное число для 1, 21, 101", () => {
    expect(f(1)).toBe("позиция");
    expect(f(21)).toBe("позиция");
    expect(f(101)).toBe("позиция");
  });

  it("форма для 2–4 и их десятков", () => {
    expect(f(2)).toBe("позиции");
    expect(f(3)).toBe("позиции");
    expect(f(4)).toBe("позиции");
    expect(f(22)).toBe("позиции");
    expect(f(104)).toBe("позиции");
  });

  it("родительный для 5–20 и нуля", () => {
    expect(f(0)).toBe("позиций");
    expect(f(5)).toBe("позиций");
    expect(f(11)).toBe("позиций");
    expect(f(14)).toBe("позиций");
    expect(f(20)).toBe("позиций");
  });

  it("подростки 11–14 не становятся единственным числом", () => {
    // Ровно этот случай ломает наивное `n % 10 === 1`.
    expect(f(11)).toBe("позиций");
    expect(f(12)).toBe("позиций");
    expect(f(111)).toBe("позиций");
  });
});

describe("plural", () => {
  it("склеивает число с формой", () => {
    expect(plural(1, "заказ", "заказа", "заказов")).toBe("1 заказ");
    expect(plural(3, "заказ", "заказа", "заказов")).toBe("3 заказа");
    expect(plural(7, "заказ", "заказа", "заказов")).toBe("7 заказов");
  });
});
