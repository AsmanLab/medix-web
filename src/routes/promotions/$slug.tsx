import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Tag } from "lucide-react";
import { isAppError } from "@/api/errors";
import { fetchPromotion } from "@/api/cms";
import { fetchMediaDownloadUrl } from "@/api/media";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { CmsHtml } from "@/features/cms/CmsHtml";

export const Route = createFileRoute("/promotions/$slug")({
  component: PromotionDetailPage,
});

function PromotionDetailPage() {
  const { slug } = Route.useParams();

  const query = useQuery({
    queryKey: queryKeys.cms.promotion(slug),
    queryFn: ({ signal }) => fetchPromotion(slug, signal),
    retry: (count, err: unknown) => {
      if (isAppError(err) && err.status === 404) return false;
      return count < 1;
    },
  });

  const promo = query.data;
  const notFound =
    query.isError && isAppError(query.error) && query.error.status === 404;

  const imageKey = promo?.image_key?.trim() || "";
  const imageQuery = useQuery({
    queryKey: queryKeys.cms.promotionImages(imageKey ? [imageKey] : []),
    queryFn: ({ signal }) => fetchMediaDownloadUrl(imageKey, signal),
    enabled: !!imageKey,
    staleTime: 5 * 60_000,
  });

  return (
    <AppShell>
      <Link
        to="/promotions"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <ArrowLeft className="h-4 w-4" />К акциям
      </Link>

      <div className="mt-6">
        <StateBlock
          isLoading={query.isLoading}
          isError={query.isError && !notFound}
          error={query.error}
          onRetry={() => void query.refetch()}
        >
          {notFound ? (
            <div className="mx-auto max-w-md text-center">
              <h1 className="font-display text-6xl font-bold">404</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Акция не найдена
              </p>
              <Link
                to="/promotions"
                className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                Все акции
              </Link>
            </div>
          ) : promo ? (
            <article className="space-y-6">
              <div className="overflow-hidden rounded-3xl border border-border bg-card">
                {imageQuery.data ? (
                  <img
                    src={imageQuery.data}
                    alt=""
                    className="aspect-[16/9] w-full object-cover"
                  />
                ) : (
                  <div className="grid aspect-[16/9] place-items-center bg-primary-soft text-primary">
                    <Tag className="h-10 w-10" />
                  </div>
                )}
                <div className="p-5 sm:p-7">
                  <h1 className="font-display text-2xl font-bold sm:text-3xl">
                    {promo.title}
                  </h1>
                  {promo.description ? (
                    <div className="mt-4">
                      {/<[a-z][\s\S]*>/i.test(promo.description) ? (
                        <CmsHtml html={promo.description} />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                          {promo.description}
                        </p>
                      )}
                    </div>
                  ) : null}
                  {promo.link_url ? (
                    <a
                      href={promo.link_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                    >
                      Перейти <ArrowRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link
                      to="/catalog"
                      search={{ q: undefined }}
                      className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                    >
                      В каталог <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ) : null}
        </StateBlock>
      </div>
    </AppShell>
  );
}
