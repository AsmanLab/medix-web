import { describe, expect, it } from "vitest";
import {
  nextOrderStatuses,
  orderSourceLabel,
  orderStatusLabel,
} from "./status";

describe("orderStatusLabel", () => {
  it("maps known statuses", () => {
    expect(orderStatusLabel("shipped")).toBe("Отправлен");
    expect(orderStatusLabel("cancelled")).toBe("Отменён");
  });
});

describe("orderSourceLabel", () => {
  // Order.source в бэкенде принимает ровно два значения: "direct" и "from_rfq".
  it("maps the values the backend actually sends", () => {
    expect(orderSourceLabel("from_rfq")).toBe("Из запроса КП");
    expect(orderSourceLabel("direct")).toBe("Прямой заказ");
  });

  it("falls back to the raw value", () => {
    expect(orderSourceLabel("whatever")).toBe("whatever");
  });
});

describe("nextOrderStatuses", () => {
  it("follows the domain state machine", () => {
    expect(nextOrderStatuses("new")).toEqual(["confirmed", "cancelled"]);
    expect(nextOrderStatuses("shipped")).toEqual(["completed"]);
  });

  it("returns nothing for terminal statuses", () => {
    expect(nextOrderStatuses("completed")).toEqual([]);
    expect(nextOrderStatuses("cancelled")).toEqual([]);
  });

  it("returns nothing for an unknown status", () => {
    expect(nextOrderStatuses("bogus")).toEqual([]);
  });
});
