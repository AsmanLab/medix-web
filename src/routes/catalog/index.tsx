import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { fetchCategories, fetchProducts } from "@/api/catalog";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { cn } from "@/lib/utils";

type CatalogSearch = {
  q?: string;
  category?: string;
};

export const Route = createFileRoute("/catalog/")({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const navigate = Route.useNavigate();
  const { q: qFromUrl, category: categoryFromUrl } = Route.useSearch();
  const [draftQ, setDraftQ] = useState(qFromUrl ?? "");

  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: ({ signal }) => fetchCategories(signal),
  });

  const productsQuery = useQuery({
    queryKey: queryKeys.catalog.products({
      q: qFromUrl ?? "",
      category_id: categoryFromUrl ?? null,
    }),
    queryFn: ({ signal }) =>
      fetchProducts(
        { q: qFromUrl, category_id: categoryFromUrl, limit: 40 },
        signal,
      ),
  });

  const rootCategories = useMemo(
    () =>
      (categoriesQuery.data ?? []).filter((c) => c.is_active && !c.parent_id),
    [categoriesQuery.data],
  );

  const products = (productsQuery.data ?? []).filter((p) => p.is_published);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    void navigate({
      search: (prev) => ({
        ...prev,
        q: draftQ.trim() || undefined,
      }),
      replace: true,
    });
  }

  function selectCategory(id: string | undefined) {
    void navigate({
      search: (prev) => ({
        ...prev,
        category: id,
      }),
      replace: true,
    });
  }

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">Каталог</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Поиск и фильтр по категориям
      </p>

      <form onSubmit={applySearch} className="mt-6 flex gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Название, артикул, производитель"
            className="field-control pl-10"
          />
        </label>
        <button
          type="submit"
          className="h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Найти
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => selectCategory(undefined)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold",
            !categoryFromUrl
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          Все
        </button>
        {rootCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => selectCategory(cat.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              categoryFromUrl === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {cat.name_ru}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <StateBlock
          isLoading={productsQuery.isLoading}
          isError={productsQuery.isError}
          error={productsQuery.error}
          isEmpty={productsQuery.isSuccess && products.length === 0}
          onRetry={() => void productsQuery.refetch()}
          emptyTitle="Товары не найдены"
          emptyDescription="Измените поиск или выберите другую категорию."
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  to="/catalog/$slug"
                  params={{ slug: p.slug }}
                  className="block rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {p.sku}
                  </p>
                  <h2 className="mt-1 font-semibold text-foreground">
                    {p.name_ru}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[p.manufacturer, p.country].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {availabilityLabel(p.availability)}
                    </span>
                    <span className="font-semibold text-primary">
                      {p.price ? `${p.price} сом` : "По запросу"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </StateBlock>
      </div>
    </AppShell>
  );
}

function availabilityLabel(value: string): string {
  switch (value) {
    case "in_stock":
      return "В наличии";
    case "on_order":
      return "Под заказ";
    case "out_of_stock":
      return "Нет в наличии";
    default:
      return value;
  }
}
