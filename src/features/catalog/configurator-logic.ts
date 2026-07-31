import type { OptionGroupOut, ProductOptionOut } from "@/api/generated/schemas";

export type { OptionGroupOut, ProductOptionOut };

/**
 * Достаёт число из строки цены каталога («125000.00 KGS» → «125000.00»).
 * Нужен только для локального подсчёта итога конфигурации — на сервер цены
 * не уходят, он берёт их из каталога сам.
 */
export function parseUnitPriceAmount(
  price: string | null | undefined,
): string | null {
  if (!price) return null;
  const match = price.replace(",", ".").match(/\d+(?:\.\d+)?/);
  return match ? match[0] : null;
}

export type ConfigSelection = {
  /** groupId → selected option id (radio / required groups) */
  singles: Record<string, string>;
  /** optionId set for multi-select addons */
  multi: string[];
};

export function emptySelection(): ConfigSelection {
  return { singles: {}, multi: [] };
}

export function activeOptions(group: OptionGroupOut): ProductOptionOut[] {
  return [...(group.options ?? [])]
    .filter((o) => o.is_active)
    .sort((a, b) => a.sort - b.sort || a.name_ru.localeCompare(b.name_ru, "ru"));
}

/** Single-choice: variants or any required option in the group. */
export function isSingleChoiceGroup(group: OptionGroupOut): boolean {
  const opts = activeOptions(group);
  if (opts.length === 0) return false;
  return (
    opts.some((o) => o.option_type === "variant") ||
    opts.some((o) => o.is_required)
  );
}

export function groupRequiresSelection(group: OptionGroupOut): boolean {
  const opts = activeOptions(group);
  if (opts.length === 0) return false;
  return (
    opts.some((o) => o.is_required) ||
    opts.some((o) => o.option_type === "variant")
  );
}

export function selectedOptionsFromState(
  groups: OptionGroupOut[],
  selection: ConfigSelection,
): ProductOptionOut[] {
  const byId = new Map<string, ProductOptionOut>();
  for (const group of groups) {
    for (const opt of activeOptions(group)) {
      byId.set(opt.id, opt);
    }
  }

  const selected: ProductOptionOut[] = [];
  for (const group of groups) {
    if (isSingleChoiceGroup(group)) {
      const id = selection.singles[group.id];
      const opt = id ? byId.get(id) : undefined;
      if (opt) selected.push(opt);
    }
  }
  for (const id of selection.multi) {
    const opt = byId.get(id);
    if (opt) selected.push(opt);
  }
  return selected;
}

export function missingRequiredGroups(
  groups: OptionGroupOut[],
  selection: ConfigSelection,
): OptionGroupOut[] {
  return groups.filter((group) => {
    if (!groupRequiresSelection(group)) return false;
    if (isSingleChoiceGroup(group)) {
      return !selection.singles[group.id];
    }
    const ids = new Set(activeOptions(group).map((o) => o.id));
    return !selection.multi.some((id) => ids.has(id));
  });
}

export function buildConfigKey(
  productId: string,
  selected: ProductOptionOut[],
): string {
  const ids = selected
    .map((o) => o.id)
    .sort()
    .join(",");
  return `${productId}::${ids || "base"}`;
}

export type PriceSummary = {
  hasPriceless: boolean;
  /** Numeric total when all parts priced; else null. */
  totalAmount: number | null;
  label: string;
};

export function summarizeConfigPrice(
  basePrice: string | null | undefined,
  selected: ProductOptionOut[],
): PriceSummary {
  const parts: Array<string | null> = [basePrice ?? null];
  for (const opt of selected) {
    parts.push(opt.price);
  }

  const amounts = parts.map((p) => parseUnitPriceAmount(p));
  if (amounts.some((a) => a == null)) {
    return {
      hasPriceless: true,
      totalAmount: null,
      label: "Цена по запросу",
    };
  }

  const total = amounts.reduce((sum, a) => sum + Number(a), 0);
  return {
    hasPriceless: false,
    totalAmount: total,
    label: `${total.toFixed(2)} KGS`,
  };
}
