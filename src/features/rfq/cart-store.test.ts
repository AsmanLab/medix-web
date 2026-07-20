import { describe, expect, it, beforeEach } from "vitest";
import {
  parseUnitPriceAmount,
  rfqCartStore,
} from "./cart-store";

describe("parseUnitPriceAmount", () => {
  it("parses catalog price strings", () => {
    expect(parseUnitPriceAmount("10000.00 KGS")).toBe("10000.00");
    expect(parseUnitPriceAmount(null)).toBeNull();
  });
});

describe("rfqCartStore", () => {
  beforeEach(() => {
    rfqCartStore.clear();
  });

  it("merges identical configs and keeps distinct configs separate", () => {
    rfqCartStore.add({
      productId: "p1",
      slug: "ultrasound",
      sku: "SKU-1",
      name: "УЗИ",
      priceLabel: "10000.00 KGS",
      unitPriceAmount: "10000.00",
    });
    rfqCartStore.add({
      productId: "p1",
      slug: "ultrasound",
      sku: "SKU-1",
      name: "УЗИ",
      priceLabel: "10000.00 KGS",
      unitPriceAmount: "10000.00",
      qty: 2,
    });
    expect(rfqCartStore.get().items).toHaveLength(1);
    expect(rfqCartStore.get().items[0]?.qty).toBe(3);
    expect(rfqCartStore.get().items[0]?.lineKey).toBe("p1::base");

    rfqCartStore.add({
      productId: "p1",
      slug: "ultrasound",
      sku: "SKU-1",
      name: "УЗИ",
      priceLabel: "12500.00 KGS",
      unitPriceAmount: "10000.00",
      options: [
        {
          optionId: "opt-a",
          name: "Гарантия",
          sku: "SKU-1::opt-a",
          optionType: "service",
          priceLabel: "2500",
          unitPriceAmount: "2500",
        },
      ],
    });
    expect(rfqCartStore.get().items).toHaveLength(2);

    const baseKey = rfqCartStore.get().items[0]!.lineKey;
    rfqCartStore.setQty(baseKey, 1);
    expect(rfqCartStore.get().items.find((i) => i.lineKey === baseKey)?.qty).toBe(
      1,
    );
    rfqCartStore.remove(baseKey);
    expect(rfqCartStore.get().items).toHaveLength(1);
    expect(rfqCartStore.get().items[0]?.options).toHaveLength(1);
  });
});
