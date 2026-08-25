import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { listAdminCmsPages, type AdminCmsPageListItem } from "@/api/cms-admin";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { SITE_PAGES } from "@/features/cms/site-pages";
import { requireStaffPanel } from "@/session/guards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/cms/pages/")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: CmsPagesListPage,
});

function statusPill(status: string) {
  return (
    <span
      className={cn(
        "rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase",
        status === "published"
          ? "bg-success-soft text-success-strong"
          : "bg-warning-soft text-warning-strong",
      )}
    >
      {status === "published" ? "Published" : "Draft"}
    </span>
  );
}

function SitePagesSection({ pages }: { pages: AdminCmsPageListItem[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-muted-foreground">Страницы сайта</h2>
      <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
        {SITE_PAGES.map((site) => {
          const existing = pages.find((p) => p.slug === site.slug);
          return (
            <li
              key={site.slug}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div>
                <div className="font-semibold">{site.title}</div>
                <div className="text-xs text-muted-foreground">{site.hint}</div>
              </div>
              <div className="flex items-center gap-3">
                {existing ? statusPill(existing.status) : null}
                {existing ? (
                  <Link
                    to="/admin/cms/pages/$slug"
                    params={{ slug: site.slug }}
                    className="text-sm font-semibold text-primary"
                  >
                    Редактировать
                  </Link>
                ) : (
                  <Link
                    to="/admin/cms/pages/new"
                    search={{ slug: site.slug }}
                    className="text-sm font-semibold text-primary"
                  >
                    Заполнить
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CmsPagesListPage() {
  const listQuery = useQuery({
    queryKey: queryKeys.cms.adminPages(),
    queryFn: ({ signal }) => listAdminCmsPages(signal),
  });

  const knownSlugs = new Set(SITE_PAGES.map((p) => p.slug));
  const otherPages = (listQuery.data ?? []).filter((p) => !knownSlugs.has(p.slug));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
            <FileText className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Страницы</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <Link to="/admin/cms" className="text-primary">
                CMS
              </Link>{" "}
              · содержимое и SEO
            </p>
          </div>
        </div>
        <Link to="/admin/cms/pages/new">
          <Button>
            <Plus className="h-4 w-4" aria-hidden />
            Новая
          </Button>
        </Link>
      </header>

      <StateBlock
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        error={listQuery.error}
        onRetry={() => void listQuery.refetch()}
      >
        <div className="space-y-6">
          <SitePagesSection pages={listQuery.data ?? []} />

          {otherPages.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-muted-foreground">Другие страницы</h2>
              <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
                {otherPages.map((page) => (
                  <li key={page.slug}>
                    <Link
                      to="/admin/cms/pages/$slug"
                      params={{ slug: page.slug }}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-secondary/40"
                    >
                      <div>
                        <div className="font-semibold">{page.title}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          /{page.slug}
                        </div>
                      </div>
                      {statusPill(page.status)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </StateBlock>
    </div>
  );
}
