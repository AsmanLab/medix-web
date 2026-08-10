import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Percent, Plus } from "lucide-react";
import { listAdminPromotions } from "@/api/cms-admin";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { requireStaffPanel } from "@/session/guards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/cms/promotions/")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: CmsPromotionsListPage,
});

function CmsPromotionsListPage() {
  const listQuery = useQuery({
    queryKey: queryKeys.cms.adminPromotions(),
    queryFn: ({ signal }) => listAdminPromotions(signal),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
            <Percent className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Акции</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <Link to="/admin/cms" className="text-primary">
                CMS
              </Link>{" "}
              · промо и deep link на товар
            </p>
          </div>
        </div>
        <Link to="/admin/cms/promotions/new">
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
        emptyTitle="Нет акций"
      >
        <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
          {(listQuery.data ?? []).map((promo) => (
            <li key={promo.id}>
              <Link
                to="/admin/cms/promotions/$promotionId"
                params={{ promotionId: promo.id }}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-secondary/40"
              >
                <div>
                  <div className="font-semibold">{promo.title}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    /{promo.slug}
                    {promo.product_ids.length
                      ? ` · ${promo.product_ids.length} product(s)`
                      : ""}
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase",
                    promo.is_active
                      ? "bg-success-soft text-success-strong"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {promo.is_active ? "Active" : "Off"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </StateBlock>
    </div>
  );
}
