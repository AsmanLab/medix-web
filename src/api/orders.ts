import { apiRequest } from "@/api/client";

export type OrderSummary = {
  id: string;
  status: string;
  client_id: string;
  source: string;
  items_count: number;
  created_at: string;
};

export type OrderLineItem = {
  sku: string;
  name: string;
  qty: number;
  price: string | null;
};

export type OrderStatusHistoryEntry = {
  status: string;
  at: string;
};

export type OrderDetail = {
  id: string;
  status: string;
  source: string;
  items: OrderLineItem[];
  status_history: OrderStatusHistoryEntry[];
};

export type OrderInvoice = {
  invoice_id: string;
  status: string;
  pdf_key: string | null;
  pdf_url: string | null;
};

export type OrderInvoiceDownload = {
  invoice_id: string;
  download_url: string;
  expires_in?: number;
};

export function listOrders(signal?: AbortSignal) {
  return apiRequest<OrderSummary[]>({
    path: "/orders",
    signal,
  });
}

export function fetchOrder(orderId: string, signal?: AbortSignal) {
  return apiRequest<OrderDetail>({
    path: `/orders/${encodeURIComponent(orderId)}`,
    signal,
  });
}

export function fetchOrderInvoice(orderId: string, signal?: AbortSignal) {
  return apiRequest<OrderInvoice>({
    path: `/orders/${encodeURIComponent(orderId)}/invoice`,
    signal,
  });
}

export function downloadOrderInvoice(orderId: string, signal?: AbortSignal) {
  return apiRequest<OrderInvoiceDownload>({
    path: `/orders/${encodeURIComponent(orderId)}/invoice/download`,
    signal,
  });
}

export type PlaceOrderItemInput = {
  product_id: string;
  qty: number;
  option_type?: string | null;
  parent_line_id?: string | null;
};

export type PlaceOrderResult = {
  type: "order" | "rfq";
  id: string;
  status: string;
};

export function placeOrder(body: {
  items: PlaceOrderItemInput[];
  manager_id?: string | null;
}) {
  return apiRequest<PlaceOrderResult>({
    method: "POST",
    path: "/orders",
    body: {
      items: body.items,
      manager_id: body.manager_id ?? null,
    },
  });
}

/** Place order from local cart lines (base + option rows). */
export async function placeOrderFromCart(input: {
  items: Array<{
    productId: string;
    qty: number;
    options?: Array<{
      optionId: string;
      optionType: string;
    }>;
  }>;
  managerId?: string | null;
}): Promise<PlaceOrderResult> {
  const items: PlaceOrderItemInput[] = [];
  for (const item of input.items) {
    items.push({
      product_id: item.productId,
      qty: item.qty,
      option_type: null,
    });
    for (const opt of item.options ?? []) {
      items.push({
        product_id: opt.optionId,
        qty: item.qty,
        option_type: opt.optionType,
      });
    }
  }
  return placeOrder({ items, manager_id: input.managerId });
}
