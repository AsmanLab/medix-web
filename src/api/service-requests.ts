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
