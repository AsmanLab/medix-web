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
