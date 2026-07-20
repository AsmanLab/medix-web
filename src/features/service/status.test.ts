import { describe, expect, it } from "vitest";
import {
  buildServiceTimeline,
  serviceStatusLabel,
  serviceStatusTone,
} from "./status";

describe("serviceStatusLabel", () => {
  it("maps known statuses", () => {
    expect(serviceStatusLabel("new")).toBe("Новая");
    expect(serviceStatusLabel("in_progress")).toBe("В работе");
  });
});

describe("serviceStatusTone", () => {
  it("returns tone buckets", () => {
    expect(serviceStatusTone("completed")).toBe("success");
    expect(serviceStatusTone("cancelled")).toBe("danger");
    expect(serviceStatusTone("new")).toBe("warning");
  });
});

describe("buildServiceTimeline", () => {
  it("marks assigned as active mid-flow", () => {
    const steps = buildServiceTimeline("assigned");
    const assigned = steps.find((s) => s.key === "assigned");
    expect(assigned?.state).toBe("active");
    expect(steps.find((s) => s.key === "new")?.state).toBe("done");
  });

  it("handles cancelled", () => {
    const steps = buildServiceTimeline("cancelled");
    expect(steps.at(-1)?.key).toBe("cancelled");
    expect(steps.at(-1)?.state).toBe("active");
  });
});
