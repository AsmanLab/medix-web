import { apiRequest } from "@/api/client";

export type RfqSummary = {
  id: string;
  status: string;
  client_id: string;
  manager_id: string | null;
  items_count: number;
  created_at: string;
};

export type RfqLineItem = {
  product_id: string;
  sku: string;
  name: string;
  qty: number;
  unit_price: string | null;
  option_type: string | null;
  parent_line_id: string | null;
};

export type RfqQuote = {
  items: RfqLineItem[];
  valid_until: string | null;
  conditions: string;
  total: string | null;
};

export type RfqDetail = {
  id: string;
  status: string;
  client_id: string;
  manager_id: string | null;
  comment: string;
  items: RfqLineItem[];
  quote: RfqQuote | null;
  created_at: string;
  updated_at: string;
};

export type RfqInvoice = {
  invoice_id: string;
  status: string;
  pdf_key: string | null;
  pdf_url: string | null;
};

export type RfqInvoiceDownload = {
  invoice_id: string;
  download_url: string;
  expires_in?: number;
};

export type RfqLineItemInput = {
  product_id: string;
  sku: string;
  name: string;
  qty: number;
  unit_price_amount?: string | null;
  option_type?: string | null;
  parent_line_id?: string | null;
};

export function createRfqDraft(managerId?: string | null) {
  return apiRequest<RfqSummary>({
    method: "POST",
    path: "/rfq",
    query: managerId ? { manager_id: managerId } : undefined,
  });
}

export function addRfqItem(rfqId: string, item: RfqLineItemInput) {
  return apiRequest<RfqSummary>({
    method: "POST",
    path: `/rfq/${encodeURIComponent(rfqId)}/items`,
    body: {
      item: {
        product_id: item.product_id,
        sku: item.sku,
        name: item.name,
        qty: item.qty,
        unit_price_amount: item.unit_price_amount ?? null,
        option_type: item.option_type ?? null,
        parent_line_id: item.parent_line_id ?? null,
      },
    },
  });
}

export function submitRfq(rfqId: string, managerId?: string | null) {
  return apiRequest<void>({
    method: "POST",
    path: `/rfq/${encodeURIComponent(rfqId)}/submit`,
    body: { manager_id: managerId ?? null },
  });
}

export function listRfqs(signal?: AbortSignal) {
  return apiRequest<RfqSummary[]>({
    path: "/rfq",
    signal,
  });
}

export function fetchRfq(rfqId: string, signal?: AbortSignal) {
  return apiRequest<RfqDetail>({
    path: `/rfq/${encodeURIComponent(rfqId)}`,
    signal,
  });
}

export function acceptRfqQuote(rfqId: string) {
  return apiRequest<{ order_id: string; status: string }>({
    method: "POST",
    path: `/rfq/${encodeURIComponent(rfqId)}/accept-quote`,
  });
}

export function rejectRfqQuote(rfqId: string) {
  return apiRequest<void>({
    method: "POST",
    path: `/rfq/${encodeURIComponent(rfqId)}/reject-quote`,
  });
}

export function fetchRfqInvoice(rfqId: string, signal?: AbortSignal) {
  return apiRequest<RfqInvoice>({
    path: `/rfq/${encodeURIComponent(rfqId)}/invoice`,
    signal,
  });
}

export function downloadRfqInvoice(rfqId: string, signal?: AbortSignal) {
  return apiRequest<RfqInvoiceDownload>({
    path: `/rfq/${encodeURIComponent(rfqId)}/invoice/download`,
    signal,
  });
}

/** Create draft, push local cart lines (base + options), submit. Returns RFQ id. */
export async function submitRfqFromCart(input: {
  items: Array<{
    productId: string;
    sku: string;
    name: string;
    qty: number;
    unitPriceAmount: string | null;
    options?: Array<{
      optionId: string;
      name: string;
      sku: string;
      optionType: string;
      unitPriceAmount: string | null;
    }>;
  }>;
  managerId?: string | null;
}): Promise<string> {
  const draft = await createRfqDraft(input.managerId);
  for (const item of input.items) {
    await addRfqItem(draft.id, {
      product_id: item.productId,
      sku: item.sku,
      name: item.name,
      qty: item.qty,
      unit_price_amount: item.unitPriceAmount,
      option_type: null,
    });

    for (const opt of item.options ?? []) {
      await addRfqItem(draft.id, {
        product_id: opt.optionId,
        sku: opt.sku,
        name: opt.name,
        qty: item.qty,
        unit_price_amount: opt.unitPriceAmount,
        option_type: opt.optionType,
        parent_line_id: null,
      });
    }
  }
  await submitRfq(draft.id, input.managerId);
  return draft.id;
}
