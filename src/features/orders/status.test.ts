import { describe, expect, it } from "vitest";
import { orderSourceLabel, orderStatusLabel } from "./status";

describe("orderStatusLabel", () => {
  it("maps known statuses", () => {
    expect(orderStatusLabel("shipped")).toBe("Отправлен");
    expect(orderStatusLabel("cancelled")).toBe("Отменён");
  });
});

describe("orderSourceLabel", () => {
  it("maps rfq source", () => {
    expect(orderSourceLabel("rfq")).toBe("Из RFQ");
  });
});
