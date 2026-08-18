import { apiRequest } from "@/api/client";
import type {
  CategoryOut,
  ProductDetailOut,
  ProductListOut,
} from "@/api/generated/schemas";

export type { CategoryOut, ProductDetailOut, ProductListOut };

export function fetchCategories(signal?: AbortSignal): Promise<CategoryOut[]> {
  return apiRequest<CategoryOut[]>({
    path: "/catalog/categories",
    signal,
  });
}

/** Admin: all categories including inactive. */
export function fetchAdminCategories(
  signal?: AbortSignal,
): Promise<CategoryOut[]> {
  return apiRequest<CategoryOut[]>({
    path: "/admin/catalog/categories",
    signal,
  });
}

export type CreateCategoryBody = {
  name_ru: string;
  name_en?: string;
  slug: string;
  parent_id?: string | null;
  sort?: number;
  image_key?: string;
  seo_title?: string;
  seo_description?: string;
  is_active?: boolean;
};

export type UpdateCategoryBody = {
  name_ru?: string;
  name_en?: string;
  slug?: string;
  parent_id?: string | null;
  sort?: number;
  image_key?: string;
  seo_title?: string;
  seo_description?: string;
  is_active?: boolean;
};

export function createAdminCategory(body: CreateCategoryBody) {
  return apiRequest<CategoryOut>({
    method: "POST",
    path: "/admin/catalog/categories",
    body,
  });
}

export function updateAdminCategory(
  categoryId: string,
  body: UpdateCategoryBody,
) {
  return apiRequest<CategoryOut>({
    method: "PATCH",
    path: `/admin/catalog/categories/${encodeURIComponent(categoryId)}`,
    body,
  });
}

export function deleteAdminCategory(categoryId: string) {
  return apiRequest<void>({
    method: "DELETE",
    path: `/admin/catalog/categories/${encodeURIComponent(categoryId)}`,
  });
}

export type FetchProductsParams = {
  q?: string;
  category_id?: string | null;
  /**
   * Товары любой из категорий — раздел витрины показывает категорию вместе
   * с подкатегориями. Раньше это делалось N параллельными запросами
   * с ручной склейкой, из-за чего раздел не поддерживал пагинацию.
   */
  category_ids?: string[] | null;
  limit?: number;
  /**
   * id последнего показанного товара. Пагинация в API — keyset по возрастанию
   * id: сервер отдаёт то, что строго больше курсора. Смещения (offset) нет
   * намеренно — при вставке товара оно сдвигает выдачу и даёт дубли.
   */
  cursor?: string | null;
};

/** Сколько товаров запрашивается за раз. Потолок сервера — 100. */
export const PRODUCTS_PAGE_SIZE = 24;

export function fetchProducts(
  params: FetchProductsParams = {},
  signal?: AbortSignal,
): Promise<ProductListOut[]> {
  return apiRequest<ProductListOut[]>({
    path: "/catalog/products",
    query: {
      q: params.q?.trim() || undefined,
      category_id: params.category_id || undefined,
      category_ids: params.category_ids?.length
        ? params.category_ids
        : undefined,
      cursor: params.cursor || undefined,
      limit: params.limit ?? PRODUCTS_PAGE_SIZE,
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

// fetchProductsForCategories удалена: она делала по запросу на категорию
// и склеивала ответы на клиенте, из-за чего раздел не мог листать выдачу.
// Теперь то же самое делает сервер одним запросом с `category_ids`.

export type FetchAdminProductsParams = {
  q?: string;
  category_id?: string | null;
  is_published?: boolean | null;
  cursor?: string | null;
  limit?: number;
};

export function fetchAdminProducts(
  params: FetchAdminProductsParams = {},
  signal?: AbortSignal,
): Promise<ProductListOut[]> {
  return apiRequest<ProductListOut[]>({
    path: "/admin/catalog/products",
    query: {
      q: params.q?.trim() || undefined,
      category_id: params.category_id || undefined,
      is_published:
        params.is_published === undefined || params.is_published === null
          ? undefined
          : params.is_published,
      cursor: params.cursor || undefined,
      limit: params.limit ?? ADMIN_PRODUCTS_PAGE_SIZE,
    },
    signal,
  });
}

/** Страница списка товаров в админке. Потолок сервера — 100. */
export const ADMIN_PRODUCTS_PAGE_SIZE = 50;

export function fetchAdminProduct(
  productId: string,
  signal?: AbortSignal,
): Promise<ProductDetailOut> {
  return apiRequest<ProductDetailOut>({
    path: `/admin/catalog/products/${encodeURIComponent(productId)}`,
    signal,
  });
}

export type CreateProductBody = {
  sku: string;
  name_ru: string;
  name_en?: string;
  slug: string;
  category_ids?: string[];
  manufacturer?: string;
  country?: string;
  description_ru?: string;
  video_url?: string;
  availability?: string;
  price_amount?: number | null;
};

export type UpdateProductBody = {
  sku?: string;
  name_ru?: string;
  name_en?: string;
  slug?: string;
  category_ids?: string[];
  manufacturer?: string;
  country?: string;
  description_ru?: string;
  video_url?: string;
  availability?: string;
  price_amount?: number | null;
};

export function createAdminProduct(body: CreateProductBody) {
  return apiRequest<ProductListOut>({
    method: "POST",
    path: "/admin/catalog/products",
    body,
  });
}

export function updateAdminProduct(productId: string, body: UpdateProductBody) {
  return apiRequest<ProductDetailOut>({
    method: "PATCH",
    path: `/admin/catalog/products/${encodeURIComponent(productId)}`,
    body,
  });
}

export function deleteAdminProduct(productId: string) {
  return apiRequest<void>({
    method: "DELETE",
    path: `/admin/catalog/products/${encodeURIComponent(productId)}`,
  });
}

export function publishAdminProduct(productId: string) {
  return apiRequest<void>({
    method: "POST",
    path: `/admin/catalog/products/${encodeURIComponent(productId)}/publish`,
  });
}

export function unpublishAdminProduct(productId: string) {
  return apiRequest<void>({
    method: "POST",
    path: `/admin/catalog/products/${encodeURIComponent(productId)}/unpublish`,
  });
}

export function attachAdminProductImage(
  productId: string,
  body: { s3_key: string; sort?: number; is_primary?: boolean },
) {
  return apiRequest<ProductDetailOut>({
    method: "POST",
    path: `/admin/catalog/products/${encodeURIComponent(productId)}/images`,
    body,
  });
}

export function detachAdminProductImage(productId: string, imageId: string) {
  return apiRequest<void>({
    method: "DELETE",
    path: `/admin/catalog/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}`,
  });
}

/** Сменить обложку товара. Ответ — карточка целиком, со свежими флагами. */
export function setAdminProductPrimaryImage(productId: string, imageId: string) {
  return apiRequest<ProductDetailOut>({
    method: "POST",
    path: `/admin/catalog/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}/primary`,
  });
}

export function attachAdminProductDocument(
  productId: string,
  body: { name: string; s3_key: string },
) {
  return apiRequest<ProductDetailOut>({
    method: "POST",
    path: `/admin/catalog/products/${encodeURIComponent(productId)}/documents`,
    body,
  });
}

export function detachAdminProductDocument(
  productId: string,
  documentId: string,
) {
  return apiRequest<void>({
    method: "DELETE",
    path: `/admin/catalog/products/${encodeURIComponent(productId)}/documents/${encodeURIComponent(documentId)}`,
  });
}

export type ImportCatalogResult = {
  created: number;
  updated: number;
  errors: number;
};

export function importCatalogFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<ImportCatalogResult>({
    method: "POST",
    path: "/admin/catalog/import",
    rawBody: form,
  });
}
