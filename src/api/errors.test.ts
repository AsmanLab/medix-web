import { expect, test } from "vitest";
import { isAppError, normalizeResponseError, toAppError } from "@/api/errors";

test("toAppError wraps Error", () => {
  const err = toAppError(new Error("boom"));
  expect(isAppError(err)).toBe(true);
  expect(err.message).toBe("boom");
});

test("429 отдаёт код, сообщение сервера и Retry-After", async () => {
  const response = new Response(
    JSON.stringify({
      detail: "Слишком много попыток. Попробуйте позже.",
      code: "rate_limited",
    }),
    {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": "142" },
    },
  );

  const err = await normalizeResponseError(response);

  expect(err.status).toBe(429);
  expect(err.code).toBe("rate_limited");
  expect(err.retryAfter).toBe(142);
  expect(err.retryable).toBe(true);
  expect(err.message).toContain("Слишком много попыток");
});

test("без Retry-After поле остаётся пустым", async () => {
  const response = new Response(JSON.stringify({ detail: "нет" }), {
    status: 429,
    headers: { "content-type": "application/json" },
  });

  expect((await normalizeResponseError(response)).retryAfter).toBeUndefined();
});
