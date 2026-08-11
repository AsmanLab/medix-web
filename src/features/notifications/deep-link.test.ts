import { readFileSync } from "node:fs";
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

  it("различает заказ клиента и заказ в админке", () => {
    // Один и тот же заказ клиент открывает в кабинете, менеджер — в панели.
    expect(parseDeepLink("order/7")).toEqual({ kind: "order", id: "7" });
    expect(parseDeepLink("admin/orders/7")).toEqual({
      kind: "admin-order",
      id: "7",
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

describe("таблица адресов в service worker'е", () => {
  it("знает те же префиксы, что и разбор на странице", () => {
    // SW отдаётся без сборки и импортировать разбор не может, поэтому таблица
    // продублирована. Разъедутся — клик по уведомлению уведёт в 404, и узнаем
    // мы об этом от клиента, а не от тестов.
    const sw = readFileSync("public/firebase-messaging-sw.js", "utf8");
    const prefixes = [
      "admin/rfq/",
      "admin/orders/",
      "admin/service/",
      "admin/customers/",
      "order/",
      "rfq/",
      "service/",
    ];

    for (const prefix of prefixes) {
      expect(parseDeepLink(`${prefix}1`), prefix).not.toBeNull();
      expect(sw, prefix).toContain(`"${prefix}"`);
    }
  });
});
