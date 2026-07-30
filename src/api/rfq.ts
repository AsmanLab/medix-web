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
  /** Заполняется после конвертации RFQ→заказ (сейчас только у менеджера). */
  order_id?: string | null;
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

/**
 * Что клиент вправе сообщить о позиции. SKU, названия и цены здесь нет —
 * их определяет сервер по каталогу.
 */
export type RfqLineItemInput = {
  product_id: string;
  qty: number;
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

/**
 * Добавляет позицию в черновик RFQ.
 *
 * Отправляем только идентификатор и количество: SKU, название и цену сервер
 * берёт из каталога. Раньше они шли из тела запроса, то есть цену можно было
 * прислать любую.
 */
export function addRfqItem(rfqId: string, item: RfqLineItemInput) {
  return apiRequest<RfqSummary>({
    method: "POST",
    path: `/rfq/${encodeURIComponent(rfqId)}/items`,
    body: {
      item: {
        product_id: item.product_id,
        qty: item.qty,
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
    // sku, name и цена из корзины нужны только для отображения — на сервер
    // они не уходят, он берёт их из каталога по product_id.
    await addRfqItem(draft.id, {
      product_id: item.productId,
      qty: item.qty,
      option_type: null,
    });

    for (const opt of item.options ?? []) {
      await addRfqItem(draft.id, {
        product_id: opt.optionId,
        qty: item.qty,
        option_type: opt.optionType,
        // Связь с базовой позицией: parent_line_id — это product_id родителя,
        // а не идентификатор строки. Базовая позиция добавлена выше, поэтому
        // сервер её уже видит в черновике.
        parent_line_id: item.productId,
      });
    }
  }
  await submitRfq(draft.id, input.managerId);
  return draft.id;
}
