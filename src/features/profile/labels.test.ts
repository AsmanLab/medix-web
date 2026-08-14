import { describe, expect, it } from "vitest";
import {
  clientTypeLabel,
  profileInitials,
  verificationBanner,
  verificationFieldsLabel,
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

describe("verificationFieldsLabel", () => {
  it("translates field codes", () => {
    expect(verificationFieldsLabel(["city", "address"])).toBe("город, адрес");
  });

  it("keeps unknown codes as is", () => {
    expect(verificationFieldsLabel(["inn"])).toBe("inn");
  });
});

describe("verificationBanner", () => {
  it("says nothing to a verified client", () => {
    expect(verificationBanner("verified")).toBeNull();
  });

  it("asks an unverified client for the missing fields", () => {
    const banner = verificationBanner("unverified", ["city", "address"]);
    expect(banner?.title).toBe("Данные организации");
    expect(banner?.body).toContain("город, адрес");
  });

  it("does not promise a review that has not started", () => {
    // Прежний баннер во всех статусах писал «Проверка организации»,
    // и клиент ждал разбора, которого никто не начинал.
    expect(verificationBanner("unverified", ["city"])?.title).not.toBe(
      "Проверка организации",
    );
  });

  it("reports the queue once the profile is submitted", () => {
    const banner = verificationBanner("pending_verification");
    expect(banner?.title).toBe("Проверка организации");
    expect(banner?.tone).toBe("warning");
  });

  it("offers a rejected client a second attempt", () => {
    const banner = verificationBanner("rejected");
    expect(banner?.tone).toBe("danger");
    expect(banner?.body).toContain("заново");
  });
});
