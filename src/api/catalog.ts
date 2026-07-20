import { apiRequest } from "@/api/client";
import type {
  CategoryOut,
  ProductDetailOut,
  ProductListOut,
} from "@/api/generated/openapi";

export type { CategoryOut, ProductDetailOut, ProductListOut };

export function fetchCategories(signal?: AbortSignal): Promise<CategoryOut[]> {
  return apiRequest<CategoryOut[]>({
    path: "/catalog/categories",
    signal,
  });
}

export type FetchProductsParams = {
  q?: string;
  category_id?: string | null;
  limit?: number;
};

export function fetchProducts(
  params: FetchProductsParams = {},
  signal?: AbortSignal,
): Promise<ProductListOut[]> {
  return apiRequest<ProductListOut[]>({
    path: "/catalog/products",
    query: {
      q: params.q?.trim() || undefined,
      category_id: params.category_id || undefined,
      limit: params.limit ?? 40,
    },
    signal,
  });
}

export function fetchProductBySlug(
  slug: string,
  signal?: AbortSignal,
): Promise<ProductDetailOut> {
  return apiRequest<ProductDetailOut>({
    path: `/catalog/products/${encodeURIComponent(slug)}`,
    signal,
  });
}
