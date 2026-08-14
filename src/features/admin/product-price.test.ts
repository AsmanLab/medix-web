import { describe, expect, it } from "vitest";
import { parsePriceInput, productPriceAmount } from "./product-price";

describe("productPriceAmount", () => {
  it("takes the raw number when the API gives one", () => {
    expect(
      productPriceAmount({ price: "50000.00 KGS", price_amount: "50000.00" }),
    ).toBe("50000.00");
  });

  it("falls back to the human-readable price", () => {
    // Витрина может уехать в прод раньше API — поле не должно опустеть.
    expect(productPriceAmount({ price: "50000.00 KGS" })).toBe("50000.00");
  });

  it("leaves the field empty for price on request", () => {
    expect(productPriceAmount({ price: null, price_amount: null })).toBe("");
    expect(productPriceAmount(null)).toBe("");
  });

  it("never returns something a number input would drop", () => {
    // Прежний код клал сюда «50000.00 KGS», и поле показывалось пустым:
    // админ вбивал цену заново при каждом сохранении товара.
    const value = productPriceAmount({ price: "50000.00 KGS" });
    expect(Number.isFinite(Number(value))).toBe(true);
  });
});

describe("parsePriceInput", () => {
  it("returns null for price on request", () => {
    expect(parsePriceInput("", true)).toBeNull();
    expect(parsePriceInput("123", true)).toBeNull();
  });

  it("parses a comma as a decimal separator", () => {
    expect(parsePriceInput("1500,50", false)).toBe(1500.5);
  });

  it("rejects an empty field instead of saving zero", () => {
    expect(parsePriceInput("   ", false)).toBeUndefined();
  });

  it("rejects junk and negatives", () => {
    expect(parsePriceInput("50000.00 KGS", false)).toBeUndefined();
    expect(parsePriceInput("-5", false)).toBeUndefined();
  });

  it("accepts a plain number", () => {
    expect(parsePriceInput("50000.00", false)).toBe(50000);
  });
});
