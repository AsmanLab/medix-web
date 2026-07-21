import { apiRequest } from "@/api/client";

export type ManagerInvoiceLineItem = {
  sku: string;
  name: string;
  qty: number;
  unit_price: string | null;
  line_total: string | null;
};

export type ManagerInvoiceDetail = {
  id: string;
  status: string;
  rfq_id: string | null;
  order_id: string | null;
  pdf_key: string | null;
  pdf_url: string | null;
  total: string | null;
  requisites: string;
  items: ManagerInvoiceLineItem[];
  created_at: string | null;
  updated_at: string | null;
};

export type ManagerInvoiceDownload = {
  invoice_id: string;
  download_url: string;
  expires_in?: number;
};

export function fetchManagerInvoiceByRfq(rfqId: string, signal?: AbortSignal) {
  return apiRequest<ManagerInvoiceDetail>({
    path: `/manager/rfq/${encodeURIComponent(rfqId)}/invoice`,
    signal,
  });
}

export function fetchManagerInvoice(invoiceId: string, signal?: AbortSignal) {
  return apiRequest<ManagerInvoiceDetail>({
    path: `/manager/invoices/${encodeURIComponent(invoiceId)}`,
    signal,
  });
}

export function downloadManagerInvoice(invoiceId: string, signal?: AbortSignal) {
  return apiRequest<ManagerInvoiceDownload>({
    path: `/manager/invoices/${encodeURIComponent(invoiceId)}/download`,
    signal,
  });
}

export function publishManagerInvoice(invoiceId: string) {
  return apiRequest<void>({
    method: "POST",
    path: `/manager/invoices/${encodeURIComponent(invoiceId)}/publish`,
  });
}
