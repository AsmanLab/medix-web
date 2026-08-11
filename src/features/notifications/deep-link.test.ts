import { describe, expect, it } from "vitest";
import { parseDeepLink } from "@/features/notifications/deep-link";

describe("parseDeepLink", () => {
  it("разбирает клиентские адреса", () => {
    expect(parseDeepLink("order/abc")).toEqual({ kind: "order", id: "abc" });
    expect(parseDeepLink("rfq/abc")).toEqual({ kind: "rfq", id: "abc" });
    expect(parseDeepLink("service/abc")).toEqual({ kind: "service", id: "abc" });
    expect(parseDeepLink("profile")).toEqual({ kind: "profile" });
  });

  it("разбирает служебные адреса", () => {
    expect(parseDeepLink("admin/rfq/abc")).toEqual({
      kind: "admin-rfq",
      id: "abc",
    });
    expect(parseDeepLink("admin/service/abc")).toEqual({
      kind: "admin-service",
      id: "abc",
    });
    expect(parseDeepLink("admin/customers/abc")).toEqual({
      kind: "admin-customer",
      id: "abc",
    });
  });

  it("не путает служебный запрос с клиентским", () => {
    // Один и тот же запрос менеджер открывает как сделку, клиент — как свой.
    // Если бы `rfq/` проверялся раньше, менеджера уводило бы в кабинет клиента.
    expect(parseDeepLink("admin/rfq/42")?.kind).toBe("admin-rfq");
  });

  it("терпит ведущий слеш", () => {
    expect(parseDeepLink("/order/abc")).toEqual({ kind: "order", id: "abc" });
  });

  it("на битой ссылке никуда не ведёт", () => {
    // Переход по «/admin/commerce/» без id выкинул бы в 404 — лучше остаться.
    expect(parseDeepLink("rfq/")).toBeNull();
    expect(parseDeepLink("admin/rfq/")).toBeNull();
    expect(parseDeepLink("")).toBeNull();
    expect(parseDeepLink(null)).toBeNull();
    expect(parseDeepLink("что-то новое")).toBeNull();
  });
});
