import type {
  CartItemOut,
  CartOut,
  PlaceOrderResponse,
} from "@/api/generated/schemas";
import { apiRequest } from "@/api/client";

export type { CartOut, CartItemOut };

/**
 * Корзина живёт на сервере — это черновик запроса (ТЗ v2.0 §5.3).
 *
 * Клиент не строит связи между позициями: он отправляет товар вместе
 * с выбранными опциями, а сервер сам создаёт базовую строку, строки опций
 * и связывает их. Количество и удаление адресуются по id базовой строки,
 * опции едут за ней.
 */
export function fetchCart(signal?: AbortSignal) {
  return apiRequest<CartOut>({ path: "/cart", signal });
}

export function addToCart(input: {
  productId: string;
  qty: number;
  optionIds: string[];
}) {
  return apiRequest<CartOut>({
    method: "POST",
    path: "/cart/items",
    body: {
      product_id: input.productId,
      qty: input.qty,
      option_ids: input.optionIds,
    },
  });
}

export function setCartItemQty(lineId: string, qty: number) {
  return apiRequest<CartOut>({
    method: "PATCH",
    path: `/cart/items/${encodeURIComponent(lineId)}`,
    body: { qty },
  });
}

export function removeCartItem(lineId: string) {
  return apiRequest<CartOut>({
    method: "DELETE",
    path: `/cart/items/${encodeURIComponent(lineId)}`,
  });
}

export function clearCart() {
  return apiRequest<CartOut>({ method: "DELETE", path: "/cart" });
}

/** Оформление. Ветвитесь по `type`: заказ или запрос КП — решает сервер. */
export function checkoutCart(input?: {
  managerId?: string | null;
  comment?: string | null;
  /** Запросить КП, даже когда доступен прямой заказ (ТЗ §7.5.2). */
  forceRfq?: boolean;
}) {
  return apiRequest<PlaceOrderResponse>({
    method: "POST",
    path: "/cart/checkout",
    body: {
      manager_id: input?.managerId ?? null,
      comment: input?.comment ?? null,
      force_rfq: input?.forceRfq ?? false,
    },
  });
}

/** Базовые позиции с прицепленными к ним опциями — форма для отрисовки. */
export type CartGroup = {
  base: CartItemOut;
  options: CartItemOut[];
};

export function groupCartItems(cart: CartOut | undefined): CartGroup[] {
  if (!cart) return [];
  const bases = cart.items.filter((i) => !i.option_type);
  return bases.map((base) => ({
    base,
    options: cart.items.filter((i) => i.parent_line_id === base.id),
  }));
}
