import { apiRequest } from "@/api/client";

export type ServiceRequestComment = {
  id: string;
  author_id: string;
  text: string;
  created_at: string;
};

export type ServiceRequest = {
  id: string;
  status: string;
  client_id: string;
  equipment_type: string;
  model: string;
  description: string;
  assigned_engineer_id: string | null;
  created_at: string;
  serial_number: string;
  desired_date: string | null;
  address: string;
  contact_name: string;
  contact_phone: string;
  order_id: string | null;
  product_id: string | null;
  photo_urls: string[];
  comments: ServiceRequestComment[];
};

export type CreateServiceRequestInput = {
  equipment_type: string;
  model?: string;
  serial_number?: string;
  description: string;
  desired_date?: string | null;
  address?: string;
  contact_name?: string;
  contact_phone?: string;
  order_id?: string | null;
  product_id?: string | null;
};

export type ServiceEngineer = {
  id: string;
  phone: string;
  role: string;
};

export function createServiceRequest(body: CreateServiceRequestInput) {
  return apiRequest<ServiceRequest>({
    method: "POST",
    path: "/service-requests",
    body: {
      equipment_type: body.equipment_type,
      model: body.model ?? "",
      serial_number: body.serial_number ?? "",
      description: body.description,
      desired_date: body.desired_date ?? null,
      address: body.address ?? "",
      contact_name: body.contact_name ?? "",
      contact_phone: body.contact_phone ?? "",
      order_id: body.order_id ?? null,
      product_id: body.product_id ?? null,
    },
  });
}

export function listServiceRequests(signal?: AbortSignal) {
  return apiRequest<ServiceRequest[]>({
    path: "/service-requests",
    signal,
  });
}

export function fetchServiceRequest(requestId: string, signal?: AbortSignal) {
  return apiRequest<ServiceRequest>({
    path: `/service-requests/${encodeURIComponent(requestId)}`,
    signal,
  });
}

export function addServiceRequestPhoto(requestId: string, s3Key: string) {
  return apiRequest<ServiceRequest>({
    method: "POST",
    path: `/service-requests/${encodeURIComponent(requestId)}/photos`,
    body: { s3_key: s3Key },
  });
}

export function fetchEngineerQueue(signal?: AbortSignal) {
  return apiRequest<ServiceRequest[]>({
    path: "/service/queue",
    signal,
  });
}

export function listManagerServiceRequests(signal?: AbortSignal) {
  return apiRequest<ServiceRequest[]>({
    path: "/manager/service-requests",
    signal,
  });
}

export function listServiceEngineers(signal?: AbortSignal) {
  return apiRequest<ServiceEngineer[]>({
    path: "/service/engineers",
    signal,
  });
}

export function acceptServiceRequest(requestId: string) {
  return apiRequest<void>({
    method: "POST",
    path: `/service/${encodeURIComponent(requestId)}/accept`,
  });
}

export function assignServiceRequest(
  requestId: string,
  engineerId?: string | null,
) {
  return apiRequest<void>({
    method: "POST",
    path: `/service/${encodeURIComponent(requestId)}/assign`,
    body: { engineer_id: engineerId ?? null },
  });
}

export function updateServiceRequestStatus(
  requestId: string,
  status: string,
  comment = "",
) {
  return apiRequest<ServiceRequest>({
    method: "PATCH",
    path: `/service/${encodeURIComponent(requestId)}/status`,
    body: { status, comment },
  });
}

export function addServiceComment(requestId: string, text: string) {
  return apiRequest<{ id: string; text: string }>({
    method: "POST",
    path: `/service/${encodeURIComponent(requestId)}/comments`,
    body: { text },
  });
}
