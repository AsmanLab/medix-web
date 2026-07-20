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
