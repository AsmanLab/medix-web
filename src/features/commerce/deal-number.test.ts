import { describe, expect, it } from "vitest";
import {
  dealNumber,
  dealSearchKey,
  orderLabel,
  quoteLabel,
} from "@/features/commerce/deal-number";

describe("dealNumber", () => {
  it("делает из UUID читаемый номер", () => {
    expect(dealNumber("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "550E-8400",
    );
  });

  it("не зависит от дефисов в исходной строке", () => {
    expect(dealNumber("550e8400e29b41d4a716446655440000")).toBe("550E-8400");
  });

  it("разные заказы дают разные номера", () => {
    const a = dealNumber("550e8400-e29b-41d4-a716-446655440000");
    const b = dealNumber("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
    expect(a).not.toBe(b);
  });

  it("короткую строку возвращает как есть, не обрезая", () => {
    // Идентификатор приходит с сервера и всегда UUID, но молча выдавать
    // огрызок при неожиданном формате хуже, чем показать что пришло.
    expect(dealNumber("abc")).toBe("ABC");
  });
});

describe("orderLabel", () => {
  it("добавляет знак номера", () => {
    expect(orderLabel("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "№ 550E-8400",
    );
  });
});

describe("quoteLabel", () => {
  it("добавляет префикс КП", () => {
    expect(quoteLabel("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "КП № 550E-8400",
    );
  });
});

describe("dealSearchKey", () => {
  it("нормализованная метка с экрана находится в нормализованном сыром UUID", () => {
    const label = orderLabel("550e8400-e29b-41d4-a716-446655440000");
    const rawId = "550e8400-e29b-41d4-a716-446655440000";
    expect(dealSearchKey(rawId)).toContain(dealSearchKey(label));
  });

  it("убирает №, пробелы и дефисы, приводит к нижнему регистру", () => {
    expect(dealSearchKey("№ 550E-8400")).toBe("550e8400");
  });
});
