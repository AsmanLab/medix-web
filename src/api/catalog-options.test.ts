import { describe, expect, test, vi } from "vitest";
import { apiRequest } from "@/api/client";
import {
  createOptionGroup,
  createProductOption,
  parseOptionPrice,
} from "@/api/catalog-options";

vi.mock("@/api/client", () => ({ apiRequest: vi.fn() }));

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

describe("sort по умолчанию не подменяется на 0", () => {
  // Баг: `sort: body.sort ?? 0` отправлял явный 0 всегда, когда вызывающий
  // (админка) sort не передаёт, — сервер честно клал в 0 каждую созданную
  // группу/опцию, и порядок на карточке товара решала не очередность
  // создания, а нестабильная сортировка на выдаче (см. Medix#112).
  // Сервер сам ставит элемент в конец списка, только если sort вообще
  // отсутствует в теле запроса — значит, здесь его нельзя подставлять.

  test("createOptionGroup без sort не шлёт sort: 0", async () => {
    await createOptionGroup("p1", { name_ru: "Гарантия" });

    const [[call]] = vi.mocked(apiRequest).mock.calls;
    expect((call.body as { sort?: number }).sort).toBeUndefined();
  });

  test("createProductOption без sort не шлёт sort: 0", async () => {
    await createProductOption("p1", "g1", {
      name_ru: "+1 год",
      option_type: "addon",
    });

    const [[call]] = vi.mocked(apiRequest).mock.calls;
    expect((call.body as { sort?: number }).sort).toBeUndefined();
  });
});
