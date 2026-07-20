import { expect, test } from "vitest";
import { isAppError, toAppError } from "@/api/errors";

test("toAppError wraps Error", () => {
  const err = toAppError(new Error("boom"));
  expect(isAppError(err)).toBe(true);
  expect(err.message).toBe("boom");
});
