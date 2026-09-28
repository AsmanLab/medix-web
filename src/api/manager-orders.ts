import { apiRequest } from "@/api/client";
import type { ManagerInvoiceDetail } from "@/api/manager-invoice";

export type ManagerOrderSummary = {
  id: string;
  status: string;
  client_id: string;
  source: string;
  items_count: number;
  created_at: string;
  manager_id: string | null;
  total: string | null;
  client_name: string;
  client_organization: string;
};

export type ManagerOrderLineItem = {
  sku: string;
  name: string;
  qty: number;
  price: string | null;
};

export type ManagerOrderStatusEntry = {
  status: string;
  at: string;
};

export type ManagerOrderDetail = ManagerOrderSummary & {
  rfq_id: string | null;
  items: ManagerOrderLineItem[];
  status_history: ManagerOrderStatusEntry[];
  delivery_address: string;
  contact_name: string;
  contact_phone: string;
  comment: string;
};

export type ManagerOrderItemInput = {
  product_id: string;
  qty: number;
  option_type?: string | null;
  parent_product_id?: string | null;
  /** Ручная цена позиции — строкой или числом; без неё берётся цена каталога. */
  unit_price_amount?: string | number | null;
};

export type CreateManagerOrderBody = {
  client_id: string;
  items: ManagerOrderItemInput[];
  delivery_address?: string;
  contact_name?: string;
  contact_phone?: string;
  comment?: string;
  /** true — отправить клиенту КП вместо оформления заказа сразу. */
  as_quote?: boolean;
  requisites?: string;
};

export type PlaceOrderResponse = {
  type: "order" | "rfq" | string;
  id: string;
  status: string;
};

export type ManagerOrderStatusUpdate = {
  order_id: string;
  status: string;
};

export function listManagerOrders(
  params: { status?: string; client_id?: string } = {},
  signal?: AbortSignal,
) {
  return apiRequest<ManagerOrderSummary[]>({
    path: "/manager/orders",
    query: {
      status: params.status || undefined,
      client_id: params.client_id || undefined,
    },
    signal,
  });
}

export function fetchManagerOrder(orderId: string, signal?: AbortSignal) {
  return apiRequest<ManagerOrderDetail>({
    path: `/manager/orders/${encodeURIComponent(orderId)}`,
    signal,
  });
}

export function updateManagerOrderStatus(
  orderId: string,
  body: { status: string; comment?: string },
) {
  return apiRequest<ManagerOrderStatusUpdate>({
    method: "PATCH",
    path: `/manager/orders/${encodeURIComponent(orderId)}/status`,
    body: { status: body.status, comment: body.comment ?? "" },
  });
}

/** Ручное создание заказа менеджером — клиент принят по телефонному звонку. */
export function createManagerOrder(
  body: CreateManagerOrderBody,
): Promise<PlaceOrderResponse> {
  return apiRequest<PlaceOrderResponse>({
    method: "POST",
    path: "/manager/orders",
    body: {
      client_id: body.client_id,
      items: body.items,
      delivery_address: body.delivery_address ?? "",
      contact_name: body.contact_name ?? "",
      contact_phone: body.contact_phone ?? "",
      comment: body.comment ?? "",
      as_quote: body.as_quote ?? false,
      requisites: body.requisites ?? "",
    },
  });
}

/** Счёт по заказу. Тот же InvoiceDetailResponse, что и у счёта по RFQ. */
export function fetchManagerInvoiceByOrder(
  orderId: string,
  signal?: AbortSignal,
) {
  return apiRequest<ManagerInvoiceDetail>({
    path: `/manager/orders/${encodeURIComponent(orderId)}/invoice`,
    signal,
  });
}
