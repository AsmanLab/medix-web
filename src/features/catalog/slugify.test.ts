import { describe, expect, it } from "vitest";
import { slugifyCategoryName } from "./slugify";

describe("slugifyCategoryName", () => {
  it("transliterates Russian titles", () => {
    expect(slugifyCategoryName("Диагностика УЗИ")).toBe("diagnostika-uzi");
  });

  it("keeps latin and collapses dashes", () => {
    expect(slugifyCategoryName("  Lab  Equipment ")).toBe("lab-equipment");
  });
});
