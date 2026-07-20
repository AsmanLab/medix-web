import { describe, expect, it } from "vitest";
import {
  desiredDateToIso,
  validateServicePhoto,
} from "./submit";

describe("desiredDateToIso", () => {
  it("returns null for empty", () => {
    expect(desiredDateToIso("")).toBeNull();
    expect(desiredDateToIso("  ")).toBeNull();
  });

  it("parses YYYY-MM-DD to ISO", () => {
    const iso = desiredDateToIso("2026-07-21");
    expect(iso).toMatch(/^2026-07-21T/);
  });
});

describe("validateServicePhoto", () => {
  it("rejects non-images and oversized files", () => {
    expect(
      validateServicePhoto(
        new File(["x"], "a.pdf", { type: "application/pdf" }),
      ),
    ).toBeTruthy();
    const big = new File([new Uint8Array(6 * 1024 * 1024)], "big.jpg", {
      type: "image/jpeg",
    });
    expect(validateServicePhoto(big)).toBeTruthy();
    const ok = new File(["tiny"], "ok.png", { type: "image/png" });
    expect(validateServicePhoto(ok)).toBeNull();
  });
});
