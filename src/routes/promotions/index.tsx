import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Tag } from "lucide-react";
import { listPromotions } from "@/api/cms";
import { fetchMediaDownloadUrl } from "@/api/media";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import {
  promotionDateRange,
  promotionPeriodStatus,
  promotionStatusLabel,
  promotionStatusTone,
} from "@/features/cms/promotions";
import { StatusPill } from "@/components/ui/status-pill";
import { usePageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/promotions/")({
  component: PromotionsListPage,
});

function PromotionsListPage() {
  usePageMeta({
    title: "Акции",
    description: "Специальные предложения Medix International.",
  });

  const listQuery = useQuery({
    queryKey: queryKeys.cms.promotions(),
    queryFn: ({ signal }) => listPromotions(signal),
  });

  const items = listQuery.data ?? [];
  const imageKeys = items
    .map((i) => i.image_key?.trim())
    .filter((k): k is string => !!k);

  const imageQueries = useQueries({
    queries: imageKeys.map((key) => ({
      queryKey: queryKeys.cms.promotionImages([key]),
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        fetchMediaDownloadUrl(key, signal),
      staleTime: 5 * 60_000,
    })),
  });

  const imageByKey = new Map<string, string | null>();
  imageKeys.forEach((key, i) => {
    imageByKey.set(key, imageQueries[i]?.data ?? null);
  });

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">Акции</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Специальные предложения Medix International
      </p>

      <div className="mt-8">
        <StateBlock
          isLoading={listQuery.isLoading}
          isError={listQuery.isError}
          error={listQuery.error}
          isEmpty={listQuery.isSuccess && items.length === 0}
          onRetry={() => void listQuery.refetch()}
          loadingVariant="list"
          loadingCount={3}
          emptyIcon={Tag}
          emptyTitle="Акций пока нет"
          emptyDescription="Загляните в каталог — там актуальные позиции."
          emptyAction={
            <Link
              to="/catalog"
              search={{ q: undefined }}
              className="inline-flex text-sm font-semibold text-primary"
            >
              В каталог
            </Link>
          }
        >
          <ul className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => {
              const status = promotionPeriodStatus(item);
              const img = item.image_key
                ? imageByKey.get(item.image_key.trim())
                : null;
              return (
                <li key={item.id}>
                  <Link
                    to="/promotions/$slug"
                    params={{ slug: item.slug }}
                    className="block overflow-hidden rounded-3xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                  >
                    {img ? (
                      <img
                        src={img}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="aspect-[16/9] w-full object-cover"
                      />
                    ) : (
                      <div className="grid aspect-[16/9] place-items-center bg-primary-soft text-primary">
                        <Tag className="h-8 w-8" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-semibold leading-snug">
                          {item.title}
                        </h2>
                        <StatusPill tone={promotionStatusTone(status)}>
                          {promotionStatusLabel(status)}
                        </StatusPill>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {promotionDateRange(item.starts_at, item.ends_at)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </StateBlock>
      </div>
    </AppShell>
  );
}
