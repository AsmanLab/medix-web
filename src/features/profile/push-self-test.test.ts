import { describe, expect, it } from "vitest";
import type { PushSelfTest } from "@/api/notifications";
import { describePushSelfTest } from "@/features/profile/push-self-test";

function report(over: Partial<PushSelfTest> = {}): PushSelfTest {
  return {
    firebase_configured: true,
    devices: 1,
    sent: 1,
    errors: [],
    ...over,
  };
}

describe("describePushSelfTest", () => {
  it("нет ключа на сервере — это не проблема пользователя", () => {
    const verdict = describePushSelfTest(
      report({ firebase_configured: false, sent: 0 }),
    );

    expect(verdict.tone).toBe("error");
    expect(verdict.text).toContain("администратору");
  });

  it("устройств нет — предлагаем переподписаться", () => {
    // Токен браузера мог протухнуть или подписку сняли на другом устройстве.
    const verdict = describePushSelfTest(report({ devices: 0, sent: 0 }));

    expect(verdict.tone).toBe("warning");
    expect(verdict.text).toContain("заново");
  });

  it("показывает отказ FCM как есть", () => {
    const verdict = describePushSelfTest(
      report({ sent: 0, errors: ["UnregisteredError: not found"] }),
    );

    expect(verdict.tone).toBe("error");
    expect(verdict.text).toContain("UnregisteredError: not found");
  });

  it("отправка без ошибок — успех", () => {
    expect(describePushSelfTest(report()).tone).toBe("success");
  });

  it("часть устройств отвалилась — это не полный успех", () => {
    const verdict = describePushSelfTest(
      report({ devices: 3, sent: 1, errors: ["e1", "e2"] }),
    );

    expect(verdict.tone).toBe("warning");
    expect(verdict.text).toContain("1 из 3");
  });
});
