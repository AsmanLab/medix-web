import { expect, test } from "vitest";
import { groupCartItems, groupLineTotal } from "@/api/cart";
import type { CartItemOut, CartOut } from "@/api/generated/schemas";

function item(over: Partial<CartItemOut>): CartItemOut {
  return {
    id: "l1",
    product_id: "p1",
    sku: "SKU-1",
    name: "Аппарат",
    qty: 1,
    unit_price: "1000.00 KGS",
    line_total: "1000.00 KGS",
    option_type: null,
    parent_line_id: null,
    is_available: true,
    ...over,
  };
}

function cart(items: CartItemOut[]): CartOut {
  return {
    id: "c1",
    items,
    items_count: items.filter((i) => !i.option_type).length,
    total: null,
    has_priceless: false,
    has_unavailable: false,
    comment: "",
  };
}

test("опции прицепляются к своей базовой позиции", () => {
  const groups = groupCartItems(
    cart([
      item({ id: "base-1" }),
      item({ id: "opt-1", option_type: "addon", parent_line_id: "base-1" }),
      item({ id: "base-2" }),
    ]),
  );

  expect(groups).toHaveLength(2);
  expect(groups[0]!.base.id).toBe("base-1");
  expect(groups[0]!.options.map((o) => o.id)).toEqual(["opt-1"]);
  expect(groups[1]!.options).toEqual([]);
});

test("две комплектации одного товара не смешиваются", () => {
  // Ровно тот случай, ради которого у строк появились собственные id:
  // product_id у базовых позиций совпадает, различает только id.
  const groups = groupCartItems(
    cart([
      item({ id: "base-1", product_id: "p1" }),
      item({
        id: "opt-1",
        product_id: "o1",
        option_type: "addon",
        parent_line_id: "base-1",
      }),
      item({ id: "base-2", product_id: "p1" }),
    ]),
  );

  expect(groups.map((g) => g.options.length)).toEqual([1, 0]);
});

test("пустая корзина и отсутствие данных дают пустой список", () => {
  expect(groupCartItems(undefined)).toEqual([]);
  expect(groupCartItems(cart([]))).toEqual([]);
});

test("сумма позиции складывает товар и все его опции, а не только базовую строку", () => {
  // Баг: при увеличении количества строка под товаром показывала только
  // base.line_total, будто комплектация в сумму не входит, хотя опции
  // (см. set_cart_item_qty на сервере) едут за количеством базового товара.
  const [group] = groupCartItems(
    cart([
      item({ id: "base-1", qty: 2, unit_price: "1000.00 KGS", line_total: "2000.00 KGS" }),
      item({
        id: "opt-1",
        option_type: "addon",
        parent_line_id: "base-1",
        qty: 2,
        unit_price: "300.00 KGS",
        line_total: "600.00 KGS",
      }),
    ]),
  );

  expect(groupLineTotal(group!)).toBe("2600.00 KGS");
});

test("сумма позиции — «по запросу», если хоть одна её часть без цены", () => {
  const [group] = groupCartItems(
    cart([
      item({ id: "base-1" }),
      item({
        id: "opt-1",
        option_type: "addon",
        parent_line_id: "base-1",
        unit_price: null,
        line_total: null,
      }),
    ]),
  );

  expect(groupLineTotal(group!)).toBeNull();
});
