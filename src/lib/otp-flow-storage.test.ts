import { afterEach, expect, test } from "vitest";
import {
  clearOtpFlow,
  cooldownLeft,
  loadOtpFlow,
  OTP_FLOW_KEYS,
  saveOtpFlow,
  type OtpFlowState,
} from "@/lib/otp-flow-storage";

const KEY = OTP_FLOW_KEYS.registration;

function state(over: Partial<OtpFlowState> = {}): OtpFlowState {
  return {
    step: 3,
    phone: "996555123456",
    transactionId: "tx-1",
    ticket: "ticket-1",
    ticketExpiresAt: Date.now() + 900_000,
    cooldownUntil: null,
    codeExpiresAt: null,
    ...over,
  };
}

afterEach(() => {
  window.sessionStorage.clear();
});

test("возвращает сохранённый шаг целиком", () => {
  saveOtpFlow(KEY, state());
  expect(loadOtpFlow(KEY)).toMatchObject({
    step: 3,
    phone: "996555123456",
    ticket: "ticket-1",
  });
});

test("пусто, когда ничего не сохраняли", () => {
  expect(loadOtpFlow(KEY)).toBeNull();
});

test("истёкший тикет отбрасывается вместе с записью", () => {
  saveOtpFlow(KEY, state({ ticketExpiresAt: Date.now() - 1000 }));
  expect(loadOtpFlow(KEY)).toBeNull();
  expect(window.sessionStorage.getItem(KEY)).toBeNull();
});

test("третий шаг без тикета не восстанавливается", () => {
  saveOtpFlow(KEY, state({ ticket: "", ticketExpiresAt: null }));
  expect(loadOtpFlow(KEY)).toBeNull();
});

test("второй шаг восстанавливается без тикета — его ещё не выдали", () => {
  saveOtpFlow(KEY, state({ step: 2, ticket: "", ticketExpiresAt: null }));
  expect(loadOtpFlow(KEY)?.step).toBe(2);
});

test("битый JSON не роняет и чистит за собой", () => {
  window.sessionStorage.setItem(KEY, "{не json");
  expect(loadOtpFlow(KEY)).toBeNull();
  expect(window.sessionStorage.getItem(KEY)).toBeNull();
});

test("clearOtpFlow стирает запись", () => {
  saveOtpFlow(KEY, state());
  clearOtpFlow(KEY);
  expect(loadOtpFlow(KEY)).toBeNull();
});

test("ключи регистрации и сброса пароля не пересекаются", () => {
  saveOtpFlow(OTP_FLOW_KEYS.registration, state({ ticket: "reg" }));
  saveOtpFlow(OTP_FLOW_KEYS.passwordReset, state({ ticket: "reset" }));
  expect(loadOtpFlow(OTP_FLOW_KEYS.registration)?.ticket).toBe("reg");
  expect(loadOtpFlow(OTP_FLOW_KEYS.passwordReset)?.ticket).toBe("reset");
});

test("кулдаун считается от дедлайна и не уходит в минус", () => {
  expect(cooldownLeft(null)).toBe(0);
  expect(cooldownLeft(Date.now() - 5000)).toBe(0);
  expect(cooldownLeft(Date.now() + 30_000)).toBeGreaterThan(28);
});
