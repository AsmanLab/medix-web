import { describe, expect, it } from "vitest";
import { sanitizeCmsHtml } from "./sanitize";
import {
  promotionPeriodStatus,
  promotionStatusLabel,
} from "./promotions";

describe("sanitizeCmsHtml", () => {
  it("strips script tags", () => {
    const clean = sanitizeCmsHtml(
      '<p>Hello</p><script>alert(1)</script><a href="https://x.test">link</a>',
    );
    expect(clean).toContain("<p>Hello</p>");
    expect(clean).toContain("link");
    expect(clean.toLowerCase()).not.toContain("<script");
  });
});

describe("promotionPeriodStatus", () => {
  const now = new Date("2026-07-21T12:00:00Z");

  it("detects active / upcoming / expired", () => {
    expect(
      promotionPeriodStatus(
        {
          starts_at: "2026-07-01T00:00:00Z",
          ends_at: "2026-08-01T00:00:00Z",
        },
        now,
      ),
    ).toBe("active");
    expect(
      promotionPeriodStatus(
        {
          starts_at: "2026-08-01T00:00:00Z",
          ends_at: "2026-09-01T00:00:00Z",
        },
        now,
      ),
    ).toBe("upcoming");
    expect(
      promotionPeriodStatus(
        {
          starts_at: "2026-06-01T00:00:00Z",
          ends_at: "2026-07-01T00:00:00Z",
        },
        now,
      ),
    ).toBe("expired");
    expect(promotionStatusLabel("expired")).toBe("Истекла");
  });
});
