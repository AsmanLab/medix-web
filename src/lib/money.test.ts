import { describe, expect, test } from "vitest";
import { formatAmount, formatMoney, formatPrice, parseMoney } from "@/lib/money";

// В ru-RU разделитель разрядов — неразрывный пробел, поэтому сравниваем
// через нормализацию: иначе тест ломается на невидимом символе.
const norm = (s: string) => s.replace(/[\s ]/g, " ");

describe("parseMoney", () => {
  test("разбирает строку сервера", () => {
    expect(parseMoney("50000.00 KGS")).toEqual({
      amount: 50000,
      currency: "KGS",
    });
  });

  test("понимает запятую и дробную часть", () => {
    expect(parseMoney("1234,50 KGS")).toEqual({ amount: 1234.5, currency: "KGS" });
  });

  test("пустое и мусор дают null", () => {
    expect(parseMoney(null)).toBeNull();
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("по запросу")).toBeNull();
  });
});

describe("formatAmount", () => {
  test("разделяет разряды и подставляет валюту", () => {
    expect(norm(formatAmount(50000))).toBe("50 000 сом");
    expect(norm(formatAmount(1234567.89))).toBe("1 234 567,89 сом");
  });

  test("нулевые копейки не показываются", () => {
    expect(norm(formatAmount(811000))).toBe("811 000 сом");
  });

  test("неизвестная валюта остаётся кодом", () => {
    expect(norm(formatAmount(100, "XYZ"))).toBe("100 XYZ");
  });
});

describe("formatMoney", () => {
  test("основной случай", () => {
    expect(norm(formatMoney("811000.00 KGS"))).toBe("811 000 сом");
  });

  test("пустое значение даёт fallback", () => {
    expect(formatMoney(null)).toBe("");
    expect(formatMoney(null, "—")).toBe("—");
  });

  test("нераспознанное возвращается как есть", () => {
    // Показать сырую строку лучше, чем стереть её.
    expect(formatMoney("по договорённости")).toBe("по договорённости");
  });

  test("повторное форматирование не портит результат", () => {
    // Строку могут прогнать дважды — итог должен остаться читаемым.
    expect(norm(formatMoney(formatMoney("50000.00 KGS")))).toBe("50 000 сом");
  });
});

describe("formatPrice", () => {
  test("отсутствие цены — «Цена по запросу»", () => {
    expect(formatPrice(null)).toBe("Цена по запросу");
    expect(formatPrice("")).toBe("Цена по запросу");
  });
});
