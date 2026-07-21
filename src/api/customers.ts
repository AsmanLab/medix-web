import { apiRequest } from "@/api/client";

export type ManagerCustomer = {
  id: string;
  user_id: string;
  full_name: string;
  organization: string;
  city: string;
  address: string;
  client_type: string;
  verification_status: string;
  phone?: string;
};

export type VerificationAudit = {
  id: string;
  customer_id: string;
  changed_by: string;
  old_status: string;
  new_status: string;
  comment: string;
  occurred_at: string;
};

export type CustomerStatusFilter =
  | "unverified"
  | "pending_verification"
  | "verified"
  | "rejected";

export function listManagerCustomers(
  status?: CustomerStatusFilter | null,
  signal?: AbortSignal,
) {
  return apiRequest<ManagerCustomer[]>({
    path: "/manager/customers",
    query: status ? { status } : undefined,
    signal,
  });
}

export function verifyCustomer(customerId: string, comment = "") {
  return apiRequest<void>({
    method: "POST",
    path: `/manager/customers/${encodeURIComponent(customerId)}/verify`,
    body: { comment },
  });
}

export function rejectCustomer(customerId: string, reason: string) {
  return apiRequest<void>({
    method: "POST",
    path: `/manager/customers/${encodeURIComponent(customerId)}/reject`,
    body: { reason },
  });
}

export function requestCustomerInfo(customerId: string, missingInfo: string) {
  return apiRequest<void>({
    method: "POST",
    path: `/manager/customers/${encodeURIComponent(customerId)}/request-info`,
    body: { missing_info: missingInfo },
  });
}

export function fetchCustomerVerificationAudit(
  customerId: string,
  signal?: AbortSignal,
) {
  return apiRequest<VerificationAudit[]>({
    path: `/manager/customers/${encodeURIComponent(customerId)}/verification-audit`,
    signal,
  });
}
