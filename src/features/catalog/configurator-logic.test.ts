import { describe, expect, it } from "vitest";
import type { OptionGroupOut } from "@/api/generated/schemas";
import {
  buildConfigKey,
  emptySelection,
  isSingleChoiceGroup,
  missingRequiredGroups,
  selectedOptionsFromState,
  summarizeConfigPrice,
} from "./configurator-logic";

const groups: OptionGroupOut[] = [
  {
    id: "g1",
    name_ru: "ÐšÐ¾Ð¼Ð¿Ð»ÐµÐºÑ‚Ð°Ñ†Ð¸Ñ",
    sort: 0,
    options: [
      {
        id: "v1",
        name_ru: "Ð‘Ð°Ð·Ð¾Ð²Ð°Ñ",
        name_en: "Base",
        option_type: "variant",
        price: "0",
        is_required: true,
        is_active: true,
        sort: 0,
      },
      {
        id: "v2",
        name_ru: "Ð Ð°ÑÑˆÐ¸Ñ€ÐµÐ½Ð½Ð°Ñ",
        name_en: "Pro",
        option_type: "variant",
        price: "5000.00 KGS",
        is_required: true,
        is_active: true,
        sort: 1,
      },
    ],
  },
  {
    id: "g2",
    name_ru: "Ð”Ð¾Ð¿Ð¾Ð»Ð½Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ð¾",
    sort: 1,
    options: [
      {
        id: "a1",
        name_ru: "Ð“Ð°Ñ€Ð°Ð½Ñ‚Ð¸Ñ +1 Ð³Ð¾Ð´",
        name_en: "Warranty",
        option_type: "addon",
        price: "2000.00 KGS",
        is_required: false,
        is_active: true,
        sort: 0,
      },
    ],
  },
];

describe("configurator-logic", () => {
  it("treats variant groups as single-choice", () => {
    expect(isSingleChoiceGroup(groups[0]!)).toBe(true);
    expect(isSingleChoiceGroup(groups[1]!)).toBe(false);
  });

  it("requires variant selection", () => {
    expect(missingRequiredGroups(groups, emptySelection())).toHaveLength(1);
    const sel = emptySelection();
    sel.singles.g1 = "v1";
    expect(missingRequiredGroups(groups, sel)).toHaveLength(0);
  });

  it("summarizes priced and priceless totals", () => {
    const sel = emptySelection();
    sel.singles.g1 = "v2";
    sel.multi = ["a1"];
    const selected = selectedOptionsFromState(groups, sel);
    expect(summarizeConfigPrice("10000.00 KGS", selected).label).toBe(
      "17000.00 KGS",
    );
    expect(summarizeConfigPrice(null, selected).hasPriceless).toBe(true);
  });

  it("builds stable config keys", () => {
    const sel = emptySelection();
    sel.singles.g1 = "v1";
    sel.multi = ["a1"];
    const selected = selectedOptionsFromState(groups, sel);
    expect(buildConfigKey("p1", selected)).toBe("p1::a1,v1");
  });
});
