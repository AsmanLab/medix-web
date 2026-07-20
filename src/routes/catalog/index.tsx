import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/api/catalog";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";

export const Route = createFileRoute("/catalog/")({
  component: CatalogPage,
});

function CatalogPage() {
  const query = useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: ({ signal }) => fetchCategories(signal),
  });
  const categories = (query.data ?? []).filter(
    (c) => c.is_active && !c.parent_id,
  );

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">Каталог</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Категории медицинского оборудования
      </p>
      <div className="mt-8">
        <StateBlock
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={query.isSuccess && categories.length === 0}
          onRetry={() => void query.refetch()}
          emptyTitle="Категории пока пусты"
          emptyDescription="Опубликуйте категории в админке или через API."
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {categories.map((cat) => (
              <li
                key={cat.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
              >
                <h2 className="font-semibold">{cat.name_ru}</h2>
                {cat.slug ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    /{cat.slug}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </StateBlock>
      </div>
    </AppShell>
  );
}
