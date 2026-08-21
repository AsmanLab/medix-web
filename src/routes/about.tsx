import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { isAppError } from "@/api/errors";
import { fetchCmsPage } from "@/api/cms";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { CmsHtml } from "@/features/cms/CmsHtml";
import { usePageMeta } from "@/lib/page-meta";
import { useT } from "@/i18n/LocaleProvider";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  const t = useT();
  usePageMeta({ title: t("О компании"), description: null });

  const query = useQuery({
    queryKey: queryKeys.cms.page("about"),
    queryFn: ({ signal }) => fetchCmsPage("about", signal),
    retry: (count, err: unknown) => {
      if (isAppError(err) && err.status === 404) return false;
      return count < 1;
    },
  });

  const page = query.data;
  const notFound =
    query.isError && isAppError(query.error) && query.error.status === 404;

  return (
    <AppShell>
      <StateBlock
        isLoading={query.isLoading}
        isError={query.isError && !notFound}
        error={query.error}
        onRetry={() => void query.refetch()}
      >
        {notFound ? (
          <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <h1 className="font-display text-2xl font-bold">{t("О компании")}</h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              {t(
                "Страница ещё не опубликована в CMS. Посмотрите акции или свяжитесь с нами.",
              )}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/contacts"
                className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                {t("Контакты")}
              </Link>
              <Link
                to="/promotions"
                className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-5 text-sm font-semibold"
              >
                {t("Акции")}
              </Link>
            </div>
          </div>
        ) : page ? (
          <article>
            <h1 className="font-display text-3xl font-bold">
              {page.title || t("О компании")}
            </h1>
            <div className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-8">
              <CmsHtml html={page.body_html} />
            </div>
          </article>
        ) : null}
      </StateBlock>
    </AppShell>
  );
}
