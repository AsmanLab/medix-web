import type { components } from "@/api/generated/openapi";
import { apiRequest } from "@/api/client";

export type InvoiceSettings = components["schemas"]["InvoiceSettingsOut"];
export type InvoiceSettingsInput = components["schemas"]["InvoiceSettingsBody"];

/**
 * Реквизиты организации для счёта (договор п. 5.2, ТЗ п. 10.1 «Настройки»).
 *
 * В счёт они попадают снимком в момент его создания, поэтому правка здесь
 * не меняет уже выставленные документы — только будущие.
 */
export function fetchInvoiceSettings(signal?: AbortSignal) {
  return apiRequest<InvoiceSettings>({
    path: "/admin/settings/invoice",
    signal,
  });
}

export function saveInvoiceSettings(body: InvoiceSettingsInput) {
  return apiRequest<InvoiceSettings>({
    method: "PUT",
    path: "/admin/settings/invoice",
    body,
  });
}
