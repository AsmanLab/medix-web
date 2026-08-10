import { describe, expect, it } from "vitest";
import { orderLabel, orderNumber } from "@/features/orders/order-number";

describe("orderNumber", () => {
  it("делает из UUID читаемый номер", () => {
    expect(orderNumber("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "550E-8400",
    );
  });

  it("не зависит от дефисов в исходной строке", () => {
    expect(orderNumber("550e8400e29b41d4a716446655440000")).toBe("550E-8400");
  });

  it("разные заказы дают разные номера", () => {
    const a = orderNumber("550e8400-e29b-41d4-a716-446655440000");
    const b = orderNumber("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
    expect(a).not.toBe(b);
  });

  it("короткую строку возвращает как есть, не обрезая", () => {
    // Идентификатор приходит с сервера и всегда UUID, но молча выдавать
    // огрызок при неожиданном формате хуже, чем показать что пришло.
    expect(orderNumber("abc")).toBe("ABC");
  });
});

describe("orderLabel", () => {
  it("добавляет знак номера", () => {
    expect(orderLabel("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "№ 550E-8400",
    );
  });
});
