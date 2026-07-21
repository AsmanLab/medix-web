import { apiRequest } from "@/api/client";
import type { RfqDetail, RfqLineItem, RfqSummary } from "@/api/rfq";

export type { RfqDetail, RfqLineItem, RfqSummary };

export type PublishQuoteItemInput = {
  product_id: string;
  sku: string;
  name: string;
  qty: number;
  unit_price_amount?: string | null;
  option_type?: string | null;
  parent_line_id?: string | null;
};

export type PublishQuoteBody = {
  items: PublishQuoteItemInput[];
  valid_until?: string | null;
  conditions?: string;
};

export type QuotePublishedResult = {
  rfq_id: string;
  status: string;
};

export type ConvertRfqResult = {
  order_id: string;
  status: string;
};

export function listManagerRfqs(signal?: AbortSignal) {
  return apiRequest<RfqSummary[]>({
    path: "/manager/rfq",
    signal,
  });
}

export function fetchManagerRfq(rfqId: string, signal?: AbortSignal) {
  return apiRequest<RfqDetail>({
    path: `/manager/rfq/${encodeURIComponent(rfqId)}`,
    signal,
  });
}

export function takeManagerRfq(rfqId: string) {
  return apiRequest<void>({
    method: "POST",
    path: `/manager/rfq/${encodeURIComponent(rfqId)}/take`,
  });
}

export function publishManagerQuote(rfqId: string, body: PublishQuoteBody) {
  return apiRequest<QuotePublishedResult>({
    method: "POST",
    path: `/manager/rfq/${encodeURIComponent(rfqId)}/quote`,
    body: {
      items: body.items,
      valid_until: body.valid_until || null,
      conditions: body.conditions ?? "",
    },
  });
}

export function convertManagerRfq(rfqId: string) {
  return apiRequest<ConvertRfqResult>({
    method: "POST",
    path: `/manager/rfq/${encodeURIComponent(rfqId)}/convert-to-order`,
  });
}
