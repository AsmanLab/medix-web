import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { isAppError } from "@/api/errors";
import { fetchCmsPage } from "@/api/cms";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { CmsHtml } from "@/features/cms/CmsHtml";
import { usePageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/pages/$slug")({
  component: CmsSlugPage,
});

function CmsSlugPage() {
  const { slug } = Route.useParams();
  const query = useQuery({
    queryKey: queryKeys.cms.page(slug),
    queryFn: ({ signal }) => fetchCmsPage(slug, signal),
    retry: (count, err: unknown) => {
      if (isAppError(err) && err.status === 404) return false;
      return count < 1;
    },
  });

  const page = query.data;
  const notFound =
    query.isError && isAppError(query.error) && query.error.status === 404;

  // seo_title и seo_description заполняются в админке — до сих пор они
  // никуда не попадали. Если их не задали, берём заголовок страницы.
  usePageMeta({
    title: page?.seo_title || page?.title,
    description: page?.seo_description,
  });

  return (
    <AppShell>
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
              Страница «{slug}» не найдена или не опубликована
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              На главную
            </Link>
          </div>
        ) : page ? (
          <article>
            <h1 className="font-display text-3xl font-bold">{page.title}</h1>
            <div className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-8">
              <CmsHtml html={page.body_html} />
            </div>
          </article>
        ) : null}
      </StateBlock>
    </AppShell>
  );
}
