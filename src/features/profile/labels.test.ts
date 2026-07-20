import { describe, expect, it } from "vitest";
import {
  clientTypeLabel,
  profileInitials,
  verificationLabel,
} from "./labels";

describe("verificationLabel", () => {
  it("maps pending_verification", () => {
    expect(verificationLabel("pending_verification")).toBe("На проверке");
  });
});

describe("clientTypeLabel", () => {
  it("maps clinic", () => {
    expect(clientTypeLabel("clinic")).toBe("Клиника");
  });
});

describe("profileInitials", () => {
  it("builds from full name", () => {
    expect(profileInitials("Айбек Кудайбергенов")).toBe("АК");
  });
});
