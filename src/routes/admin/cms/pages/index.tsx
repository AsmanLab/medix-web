import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { listAdminCmsPages } from "@/api/cms-admin";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { requireStaffPanel } from "@/session/guards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/cms/pages/")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: CmsPagesListPage,
});

function CmsPagesListPage() {
  const listQuery = useQuery({
    queryKey: queryKeys.cms.adminPages(),
    queryFn: ({ signal }) => listAdminCmsPages(signal),
  });

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
              · редактирование HTML и SEO
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
        isEmpty={listQuery.isSuccess && (listQuery.data?.length ?? 0) === 0}
        emptyTitle="Нет страниц"
      >
        <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
          {(listQuery.data ?? []).map((page) => (
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
                <span
                  className={cn(
                    "rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase",
                    page.status === "published"
                      ? "bg-emerald-500/15 text-emerald-700"
                      : "bg-amber-500/15 text-amber-700",
                  )}
                >
                  {page.status === "published" ? "Published" : "Draft"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </StateBlock>
    </div>
  );
}
