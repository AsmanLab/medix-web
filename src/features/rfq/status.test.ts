import { describe, expect, it } from "vitest";
import { buildRfqTimeline, rfqStatusLabel } from "./status";

describe("rfqStatusLabel", () => {
  it("maps known statuses", () => {
    expect(rfqStatusLabel("quoted")).toBe("Есть КП");
  });
});

describe("buildRfqTimeline", () => {
  it("marks steps for quoted status", () => {
    const steps = buildRfqTimeline("quoted");
    expect(steps.find((s) => s.key === "quoted")?.state).toBe("active");
    expect(steps.find((s) => s.key === "submitted")?.state).toBe("done");
    expect(steps.find((s) => s.key === "accepted")?.state).toBe("pending");
  });
});
