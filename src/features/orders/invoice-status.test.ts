import { describe, expect, it } from "vitest";
import { invoiceStatusLabel } from "@/features/orders/status";

/**
 * Medix#88: рядом со счётом в карточке заказа стояло английское
 * «published» — выводился сырой статус из API.
 */
describe("invoiceStatusLabel", () => {
  it("переводит статусы счёта", () => {
    expect(invoiceStatusLabel("published")).toBe("Выставлен");
    expect(invoiceStatusLabel("draft")).toBe("Черновик");
  });

  it("неизвестный статус отдаёт как есть", () => {
    // Пустая строка спрятала бы расширение перечисления на бэкенде,
    // а так его сразу видно в интерфейсе.
    expect(invoiceStatusLabel("archived")).toBe("archived");
  });

  it("покрывает значения InvoiceStatus из домена", () => {
    // Домен: commerce/domain/entities.py, InvoiceStatus.
    for (const status of ["draft", "published"]) {
      expect(invoiceStatusLabel(status)).not.toBe(status);
    }
  });
});
