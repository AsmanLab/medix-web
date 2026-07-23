import { apiRequest } from "@/api/client";
import type { ContactOffice } from "@/api/cms";

export type AdminCmsPageListItem = {
  slug: string;
  title: string;
  status: string;
  updated_at: string | null;
};

export type AdminCmsPage = {
  slug: string;
  title: string;
  body_html: string;
  seo_title: string;
  seo_description: string;
  status: string;
  updated_at: string | null;
};

export type AdminPromotion = {
  id: string;
  title: string;
  slug: string;
  description: string;
  image_key: string;
  link_url: string;
  sort: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  product_ids: string[];
};

export type CreatePageInput = {
  slug: string;
  title: string;
  body_html?: string;
  seo_title?: string;
  seo_description?: string;
  status?: string;
};

export type UpdatePageInput = {
  title?: string;
  body_html?: string;
  seo_title?: string;
  seo_description?: string;
  status?: string;
};

export type UpsertContactInput = {
  name: string;
  address?: string;
  phone_sales?: string;
  phone_service?: string;
  phone_accounting?: string;
  working_hours?: string;
  map_embed_url?: string;
};

export type CreatePromotionInput = {
  title: string;
  slug: string;
  image_key?: string;
  description?: string;
  link_url?: string;
  sort?: number;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  product_ids?: string[];
};

export type UpdatePromotionInput = {
  title?: string;
  slug?: string;
  image_key?: string;
  description?: string;
  link_url?: string;
  sort?: number;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  product_ids?: string[];
};

export function listAdminCmsPages(signal?: AbortSignal) {
  return apiRequest<AdminCmsPageListItem[]>({
    path: "/admin/cms/pages",
    signal,
  });
}

export function fetchAdminCmsPage(slug: string, signal?: AbortSignal) {
  return apiRequest<AdminCmsPage>({
    path: `/admin/cms/pages/${encodeURIComponent(slug)}`,
    signal,
  });
}

export function createAdminCmsPage(body: CreatePageInput) {
  return apiRequest<{ id: string; slug: string }>({
    method: "POST",
    path: "/admin/cms/pages",
    body: {
      slug: body.slug,
      title: body.title,
      body_html: body.body_html ?? "",
      seo_title: body.seo_title ?? "",
      seo_description: body.seo_description ?? "",
      status: body.status ?? "draft",
    },
  });
}

export function updateAdminCmsPage(slug: string, body: UpdatePageInput) {
  return apiRequest<{ slug: string; status: string }>({
    method: "PATCH",
    path: `/admin/cms/pages/${encodeURIComponent(slug)}`,
    body,
  });
}

export function deleteAdminCmsPage(slug: string) {
  return apiRequest<void>({
    method: "DELETE",
    path: `/admin/cms/pages/${encodeURIComponent(slug)}`,
  });
}

export function listAdminPromotions(signal?: AbortSignal) {
  return apiRequest<AdminPromotion[]>({
    path: "/admin/cms/promotions",
    signal,
  });
}

export function fetchAdminPromotion(id: string, signal?: AbortSignal) {
  return apiRequest<AdminPromotion>({
    path: `/admin/cms/promotions/${encodeURIComponent(id)}`,
    signal,
  });
}

export function createAdminPromotion(body: CreatePromotionInput) {
  return apiRequest<{ id: string }>({
    method: "POST",
    path: "/admin/cms/promotions",
    body: {
      title: body.title,
      slug: body.slug,
      image_key: body.image_key ?? "",
      description: body.description ?? "",
      link_url: body.link_url ?? "",
      sort: body.sort ?? 0,
      is_active: body.is_active ?? true,
      starts_at: body.starts_at ?? null,
      ends_at: body.ends_at ?? null,
      product_ids: body.product_ids ?? [],
    },
  });
}

export function updateAdminPromotion(id: string, body: UpdatePromotionInput) {
  return apiRequest<{ id: string }>({
    method: "PATCH",
    path: `/admin/cms/promotions/${encodeURIComponent(id)}`,
    body,
  });
}

export function deleteAdminPromotion(id: string) {
  return apiRequest<void>({
    method: "DELETE",
    path: `/admin/cms/promotions/${encodeURIComponent(id)}`,
  });
}

export function upsertAdminContact(body: UpsertContactInput) {
  return apiRequest<{ id: string }>({
    method: "PUT",
    path: "/admin/cms/contacts",
    body: {
      name: body.name,
      address: body.address ?? "",
      phone_sales: body.phone_sales ?? "",
      phone_service: body.phone_service ?? "",
      phone_accounting: body.phone_accounting ?? "",
      working_hours: body.working_hours ?? "",
      map_embed_url: body.map_embed_url ?? "",
    },
  });
}

export type AdminBanner = {
  id: string;
  image_key: string;
  title: string;
  subtitle: string;
  cta_text: string;
  link_url: string;
  deep_link: string;
  sort: number;
  is_enabled: boolean;
};

export type CreateBannerInput = {
  image_key: string;
  title?: string;
  subtitle?: string;
  cta_text?: string;
  link_url?: string;
  deep_link?: string;
  sort?: number;
  is_enabled?: boolean;
};

export type UpdateBannerInput = Partial<CreateBannerInput>;

export function listAdminBanners(signal?: AbortSignal) {
  return apiRequest<AdminBanner[]>({
    path: "/admin/cms/banners",
    signal,
  });
}

export function createAdminBanner(body: CreateBannerInput) {
  return apiRequest<{ id: string }>({
    method: "POST",
    path: "/admin/cms/banners",
    body: {
      image_key: body.image_key,
      title: body.title ?? "",
      subtitle: body.subtitle ?? "",
      cta_text: body.cta_text ?? "",
      link_url: body.link_url ?? "",
      deep_link: body.deep_link ?? "",
      sort: body.sort ?? 0,
      is_enabled: body.is_enabled ?? true,
    },
  });
}

export function updateAdminBanner(id: string, body: UpdateBannerInput) {
  return apiRequest<{ id: string }>({
    method: "PATCH",
    path: `/admin/cms/banners/${encodeURIComponent(id)}`,
    body,
  });
}

export function deleteAdminBanner(id: string) {
  return apiRequest<void>({
    method: "DELETE",
    path: `/admin/cms/banners/${encodeURIComponent(id)}`,
  });
}

export type { ContactOffice };
