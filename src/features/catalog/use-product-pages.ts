import { useInfiniteQuery } from "@tanstack/react-query";
import {
  fetchProducts,
  PRODUCTS_PAGE_SIZE,
  type ProductListOut,
} from "@/api/catalog";
import { queryKeys } from "@/api/query-keys";

type UseProductPagesInput = {
  q?: string;
  categoryId?: string | null;
  /**
   * Несколько категорий — раздел витрины показывает категорию вместе
   * с подкатегориями. Имеет приоритет над `categoryId`.
   */
  categoryIds?: string[];
  enabled?: boolean;
};

/**
 * Постраничная загрузка товаров витрины.
 *
 * Каталог запрашивал 48 товаров одним запросом и на этом останавливался:
 * курсор в API есть, но фронт его не использовал, поэтому при большем
 * каталоге остальные товары были недостижимы — и интерфейс об этом молчал,
 * выдача просто заканчивалась.
 *
 * Пагинация keyset: курсор — id последнего показанного товара. Признак
 * «есть ещё» — заполненная до конца страница; общего количества сервер
 * не отдаёт, а отдельный запрос ради счётчика делать не за чем.
 */
export function useProductPages({
  q,
  categoryId,
  categoryIds,
  enabled = true,
}: UseProductPagesInput) {
  // Порядок в ключе не должен влиять на кеш: дерево категорий отдаёт их
  // отсортированными, но полагаться на это не стоит.
  const ids = categoryIds?.length ? [...categoryIds].sort() : undefined;

  const query = useInfiniteQuery({
    queryKey: queryKeys.catalog.products({
      q: q ?? "",
      category_id: categoryId ?? "",
      category_ids: ids ?? [],
      paged: true,
    }),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      fetchProducts(
        {
          q,
          category_id: ids ? null : (categoryId ?? null),
          category_ids: ids,
          cursor: pageParam,
          limit: PRODUCTS_PAGE_SIZE,
        },
        signal,
      ),
    getNextPageParam: (lastPage: ProductListOut[]) =>
      lastPage.length < PRODUCTS_PAGE_SIZE
        ? undefined
        : (lastPage.at(-1)?.id ?? undefined),
    enabled,
  });

  return {
    ...query,
    // Публичная ручка отдаёт только опубликованное, но фильтр оставлен
    // как страховка на случай смены контракта.
    products: (query.data?.pages.flat() ?? []).filter((p) => p.is_published),
  };
}
