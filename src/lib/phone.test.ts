import { afterEach, expect, test } from "vitest";
import { normalizePhone, isValidKgPhone } from "@/lib/phone";

test("normalizePhone adds 996 for 9 digits", () => {
  expect(normalizePhone("555123456")).toBe("996555123456");
});

test("isValidKgPhone accepts 996XXXXXXXXX", () => {
  expect(isValidKgPhone("996555123456")).toBe(true);
  expect(isValidKgPhone("555123456")).toBe(false);
});

afterEach(() => {
  // keep file as module with side-effect free tests
});
