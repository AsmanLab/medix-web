import { useSyncExternalStore } from "react";

export type RfqCartOption = {
  optionId: string;
  name: string;
  sku: string;
  optionType: string;
  priceLabel: string | null;
  unitPriceAmount: string | null;
};

export type RfqCartItem = {
  /** Unique configured line (product + selected options). */
  lineKey: string;
  productId: string;
  slug: string;
  sku: string;
  name: string;
  /** Display price string from catalog, or null. */
  priceLabel: string | null;
  /** Decimal amount for API, or null = price on request. */
  unitPriceAmount: string | null;
  qty: number;
  options: RfqCartOption[];
};

type CartState = {
  items: RfqCartItem[];
  comment: string;
};

const KEY = "medix.rfq.cart.v2";

const empty: CartState = { items: [], comment: "" };

let state: CartState = load();
const listeners = new Set<() => void>();

function load(): CartState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return migrateV1();
    const parsed = JSON.parse(raw) as Partial<CartState>;
    const items = Array.isArray(parsed.items)
      ? parsed.items.map(normalizeItem)
      : [];
    return {
      items,
      comment: typeof parsed.comment === "string" ? parsed.comment : "",
    };
  } catch {
    return empty;
  }
}

function migrateV1(): CartState {
  try {
    const raw = window.localStorage.getItem("medix.rfq.cart.v1");
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as {
      items?: Array<Partial<RfqCartItem> & { productId?: string }>;
      comment?: string;
    };
    const items = (parsed.items ?? []).map((item) =>
      normalizeItem({
        ...item,
        lineKey: item.lineKey || item.productId || crypto.randomUUID(),
        options: item.options ?? [],
      }),
    );
    const next = {
      items,
      comment: typeof parsed.comment === "string" ? parsed.comment : "",
    };
    window.localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return empty;
  }
}

function normalizeItem(item: Partial<RfqCartItem>): RfqCartItem {
  return {
    lineKey: item.lineKey || item.productId || crypto.randomUUID(),
    productId: item.productId || "",
    slug: item.slug || "",
    sku: item.sku || "",
    name: item.name || "",
    priceLabel: item.priceLabel ?? null,
    unitPriceAmount: item.unitPriceAmount ?? null,
    qty: typeof item.qty === "number" && item.qty > 0 ? item.qty : 1,
    options: Array.isArray(item.options) ? item.options : [],
  };
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore quota
  }
}

function emit() {
  persist();
  for (const listener of listeners) listener();
}

export function parseUnitPriceAmount(price: string | null | undefined): string | null {
  if (!price) return null;
  const match = price.replace(",", ".").match(/\d+(?:\.\d+)?/);
  return match ? match[0] : null;
}

export const rfqCartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get() {
    return state;
  },
  add(input: Omit<RfqCartItem, "qty" | "lineKey" | "options"> & {
    qty?: number;
    lineKey?: string;
    options?: RfqCartOption[];
  }) {
    const qty = input.qty ?? 1;
    const options = input.options ?? [];
    const lineKey =
      input.lineKey ||
      `${input.productId}::${options
        .map((o) => o.optionId)
        .sort()
        .join(",") || "base"}`;

    const existing = state.items.find((i) => i.lineKey === lineKey);
    if (existing) {
      state = {
        ...state,
        items: state.items.map((i) =>
          i.lineKey === lineKey ? { ...i, qty: i.qty + qty } : i,
        ),
      };
    } else {
      state = {
        ...state,
        items: [
          ...state.items,
          {
            lineKey,
            productId: input.productId,
            slug: input.slug,
            sku: input.sku,
            name: input.name,
            priceLabel: input.priceLabel,
            unitPriceAmount: input.unitPriceAmount,
            qty,
            options,
          },
        ],
      };
    }
    emit();
  },
  setQty(lineKey: string, qty: number) {
    if (qty <= 0) {
      rfqCartStore.remove(lineKey);
      return;
    }
    state = {
      ...state,
      items: state.items.map((i) =>
        i.lineKey === lineKey ? { ...i, qty } : i,
      ),
    };
    emit();
  },
  remove(lineKey: string) {
    state = {
      ...state,
      items: state.items.filter((i) => i.lineKey !== lineKey),
    };
    emit();
  },
  setComment(comment: string) {
    state = { ...state, comment };
    emit();
  },
  clear() {
    state = { ...empty };
    emit();
  },
  totalQty() {
    return state.items.reduce((sum, i) => sum + i.qty, 0);
  },
  hasPriceless() {
    return state.items.some(
      (i) =>
        !i.unitPriceAmount || i.options.some((o) => !o.unitPriceAmount),
    );
  },
};

export function useRfqCart() {
  return useSyncExternalStore(
    rfqCartStore.subscribe,
    () => rfqCartStore.get(),
    () => empty,
  );
}
