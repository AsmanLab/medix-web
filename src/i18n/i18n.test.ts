import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contentText } from "@/i18n/content";
import { translate } from "@/i18n/dictionaries";
import { parseLocale, isLocale } from "@/i18n/locales";

/**
 * Каркас локализации витрины.
 *
 * Главное правило, которое здесь закреплено: **отсутствие перевода —
 * не поломка.** И строка интерфейса, и текст из API откатываются
 * на русский. Пустое место на витрине читается как сломанная страница,
 * русский текст в английском интерфейсе — как незаконченный перевод,
 * и второе честнее.
 */

describe("parseLocale", () => {
  it.each([
    ["ru", "ru"],
    ["RU", "ru"],
    ["ru-RU", "ru"],
    ["ru_RU", "ru"],
    // Регион отбрасывается: ru-KG и ru-RU для нас один язык.
    ["ru-KG", "ru"],
    ["ky", "ky"],
    ["en-US", "en"],
    ["  en  ", "en"],
  ])("приводит %s к %s", (input, expected) => {
    expect(parseLocale(input)).toBe(expected);
  });

  it.each([["fr"], ["zzz"], [""], ["-"]])("отвергает %s", (input) => {
    expect(parseLocale(input)).toBeNull();
  });

  it("правило совпадает с бэкендом", () => {
    // Если разойдётся, витрина и API начнут по-разному понимать
    // один и тот же ?lang=.
    expect(isLocale("ky")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
});

describe("translate", () => {
  it("на русском отдаёт сам ключ", () => {
    // Ключ и есть русский текст — отдельного словаря для ru нет.
    expect(translate("ru", "Добавить в корзину")).toBe("Добавить в корзину");
  });

  it("без перевода откатывается на русский, а не показывает ключ", () => {
    expect(translate("en", "Добавить в корзину")).toBe("Добавить в корзину");
  });

  it("подставляет значения", () => {
    expect(translate("ru", "Показано {count}", { count: 12 })).toBe(
      "Показано 12",
    );
  });

  it("оставляет как есть скобку, для которой значения не передали", () => {
    // Молча съесть её нельзя: пропажа куска фразы выглядит как поломка,
    // а видимое `{count}` сразу показывает, где забыли значение.
    expect(translate("ru", "Показано {count}")).toBe("Показано {count}");
  });

  it("подставляет одно значение несколько раз", () => {
    expect(translate("ru", "{n} из {n}", { n: 3 })).toBe("3 из 3");
  });
});

describe("contentText", () => {
  it("берёт переведённое поле", () => {
    expect(contentText("Laboratory", "Лаборатория")).toBe("Laboratory");
  });

  it("берёт старое поле, если нового в ответе нет", () => {
    // Витрина может уехать раньше бэкенда. В схеме `name` обязательное,
    // поэтому TypeScript считает его строкой, а старый сервер его просто
    // не пришлёт — и каталог остался бы без названий.
    expect(contentText(undefined, "Лаборатория")).toBe("Лаборатория");
  });

  it("пустую строку от нового сервера не подменяет", () => {
    // Пустое значение от нового сервера означает «названия правда нет»,
    // и подставлять туда русское неверно.
    expect(contentText("", "Лаборатория")).toBe("");
  });
});

describe("detectLocale", () => {
  const original = window.location.search;

  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  afterEach(() => {
    setSearch(original);
  });

  function setSearch(search: string) {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, search },
    });
  }

  it("по умолчанию русский", async () => {
    const { detectLocale } = await import("@/i18n/locale-store");
    expect(detectLocale()).toBe("ru");
  });

  it("не берёт язык, которого нет в AVAILABLE_LOCALES", async () => {
    // Пока переводов нет ни на чём, кроме русского, посетитель
    // с английским браузером должен увидеть цельный русский сайт,
    // а не английские названия категорий внутри русского интерфейса.
    setSearch("?lang=en");
    const { detectLocale } = await import("@/i18n/locale-store");
    expect(detectLocale()).toBe("ru");
  });

  it("не падает, если localStorage запрещён", async () => {
    // Приватный режим Safari и запрет cookies бросают на getItem.
    // Язык — не то, ради чего стоит ронять страницу.
    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("denied");
      });

    const { detectLocale } = await import("@/i18n/locale-store");
    expect(detectLocale()).toBe("ru");

    spy.mockRestore();
  });
});
