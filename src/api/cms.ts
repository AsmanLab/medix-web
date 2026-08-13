import { apiRequest } from "@/api/client";

export type BannerOut = {
  id: string;
  image_key: string;
  title: string;
  subtitle: string;
  cta_text: string;
  link_url: string;
  deep_link: string;
};

export type CmsPageOut = {
  slug: string;
  title: string;
  body_html: string;
  seo_title: string;
  seo_description: string;
};

export type PromotionListItem = {
  id: string;
  title: string;
  slug: string;
  image_key: string | null;
  link_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

export type PromotionDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image_key: string | null;
  link_url: string | null;
  product_ids: string[];
};

export type ContactOffice = {
  id: string;
  name: string;
  address: string;
  phone_sales: string | null;
  phone_service: string | null;
  phone_accounting: string | null;
  working_hours: string | null;
  map_embed_url: string | null;
};

export function fetchBanners(signal?: AbortSignal): Promise<BannerOut[]> {
  return apiRequest<BannerOut[]>({
    path: "/cms/banners",
    signal,
    retryOnUnauthorized: false,
  });
}

export type CmsPageListItem = { slug: string; title: string };

/** Опубликованные CMS-страницы. Витрина спрашивает, чтобы не звать 404. */
export function listCmsPages(signal?: AbortSignal) {
  return apiRequest<CmsPageListItem[]>({
    path: "/cms/pages",
    signal,
    retryOnUnauthorized: false,
  });
}

export function fetchCmsPage(slug: string, signal?: AbortSignal) {
  return apiRequest<CmsPageOut>({
    path: `/cms/pages/${encodeURIComponent(slug)}`,
    signal,
    retryOnUnauthorized: false,
  });
}

export function listPromotions(signal?: AbortSignal) {
  return apiRequest<PromotionListItem[]>({
    path: "/cms/promotions",
    signal,
    retryOnUnauthorized: false,
  });
}

export function fetchPromotion(slug: string, signal?: AbortSignal) {
  return apiRequest<PromotionDetail>({
    path: `/cms/promotions/${encodeURIComponent(slug)}`,
    signal,
    retryOnUnauthorized: false,
  });
}

export function fetchContacts(signal?: AbortSignal) {
  return apiRequest<ContactOffice[]>({
    path: "/cms/contacts",
    signal,
    retryOnUnauthorized: false,
  });
}
