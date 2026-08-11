import { describe, expect, it } from "vitest";
import type { OrderLineItem } from "@/api/orders";
import { orderToCartAdditions } from "@/features/orders/repeat-order";

function line(over: Partial<OrderLineItem> & { id: string }): OrderLineItem {
  return {
    product_id: `p-${over.id}`,
    sku: `SKU-${over.id}`,
    name: `Товар ${over.id}`,
    qty: 1,
    price: "100.00",
    option_type: null,
    parent_line_id: null,
    ...over,
  };
}

describe("orderToCartAdditions", () => {
  it("переносит базовые позиции с их количеством", () => {
    const additions = orderToCartAdditions([
      line({ id: "1", qty: 3 }),
      line({ id: "2", qty: 1 }),
    ]);

    expect(additions).toEqual([
      { productId: "p-1", qty: 3, optionIds: [], name: "Товар 1" },
      { productId: "p-2", qty: 1, optionIds: [], name: "Товар 2" },
    ]);
  });

  it("прицепляет опции к своей базовой позиции", () => {
    const additions = orderToCartAdditions([
      line({ id: "base", qty: 2 }),
      line({ id: "opt1", option_type: "warranty", parent_line_id: "base" }),
      line({ id: "opt2", option_type: "install", parent_line_id: "base" }),
    ]);

    expect(additions).toHaveLength(1);
    expect(additions[0]).toEqual({
      productId: "p-base",
      // Количество опций считается на единицу базового товара — в корзину
      // уходит только количество базовой строки.
      qty: 2,
      optionIds: ["p-opt1", "p-opt2"],
      name: "Товар base",
    });
  });

  it("не путает опции разных позиций", () => {
    const additions = orderToCartAdditions([
      line({ id: "a" }),
      line({ id: "b" }),
      line({ id: "oa", option_type: "warranty", parent_line_id: "a" }),
      line({ id: "ob", option_type: "warranty", parent_line_id: "b" }),
    ]);

    expect(additions.map((a) => a.optionIds)).toEqual([["p-oa"], ["p-ob"]]);
  });

  it("пропускает опции без базовой позиции", () => {
    // Такого быть не должно, но опция без родителя, добавленная в корзину
    // сама по себе, стала бы отдельным товаром в заказе клиента.
    const additions = orderToCartAdditions([
      line({ id: "orphan", option_type: "warranty", parent_line_id: "gone" }),
    ]);

    expect(additions).toEqual([]);
  });

  it("возвращает пустой список для заказа без позиций", () => {
    expect(orderToCartAdditions([])).toEqual([]);
  });
});
