import { apiRequest } from "@/api/client";
import type { CategoryOut } from "@/api/generated/openapi";

export function fetchCategories(signal?: AbortSignal): Promise<CategoryOut[]> {
  return apiRequest<CategoryOut[]>({
    path: "/catalog/categories",
    signal,
  });
}
