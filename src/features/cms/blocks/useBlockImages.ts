import { useQuery } from "@tanstack/react-query";
import { fetchMediaDownloadUrl } from "@/api/media";
import { queryKeys } from "@/api/query-keys";
import { collectBlockImageKeys, type Block } from "./schema";

/**
 * Один запрос на все картинки страницы вместо одного на каждую — иначе
 * галерея из десятка фото была бы десятком отдельных `useQuery` и десятком
 * независимых "загружается" в интерфейсе.
 *
 * staleTime — 50 минут: presigned-ссылка живёт час (`medix-core` `/download`),
 * рефетчить её на каждый ремаунт компонента незачем.
 */
export function useBlockImages(blocks: Block[]) {
  const keys = collectBlockImageKeys(blocks);

  const query = useQuery({
    queryKey: queryKeys.cms.blockImages(keys),
    queryFn: async ({ signal }) => {
      const entries = await Promise.all(
        keys.map(async (key) => [key, await fetchMediaDownloadUrl(key, signal)] as const),
      );
      return Object.fromEntries(entries) as Record<string, string | null>;
    },
    enabled: keys.length > 0,
    staleTime: 50 * 60_000,
  });

  const urls: Record<string, string | null> = query.data ?? {};
  return { urls, isLoading: keys.length > 0 && query.isLoading };
}
