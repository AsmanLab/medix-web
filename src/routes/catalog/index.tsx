import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Boxes, ChevronDown, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  fetchCategories,
  fetchProducts,
  type ProductListOut,
} from "@/api/catalog";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { availabilityLabel } from "@/features/catalog/availability";
import { buildCategoryTree } from "@/features/catalog/map-category";
import { formatMoney } from "@/lib/money";
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
  component: CatalogIndexPage,
});

function CatalogIndexPage() {
  const { q: qFromUrl, category: categoryFromUrl } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [draftQ, setDraftQ] = useState(qFromUrl ?? "");
  const [filterOpen, setFilterOpen] = useState(Boolean(categoryFromUrl));

  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: ({ signal }) => fetchCategories(signal),
  });

  const tree = useMemo(
    () => buildCategoryTree(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );

  const selectedCategory = useMemo(() => {
    if (!categoryFromUrl) return null;
    for (const section of tree) {
      if (section.id === categoryFromUrl || section.slug === categoryFromUrl) {
        return section;
      }
      for (const child of section.children) {
        if (child.id === categoryFromUrl || child.slug === categoryFromUrl) {
          return child;
        }
      }
    }
    return null;
  }, [categoryFromUrl, tree]);

  const productsQuery = useQuery({
    queryKey: queryKeys.catalog.products({
      q: qFromUrl ?? "",
      category_id: selectedCategory?.id ?? "",
    }),
    queryFn: ({ signal }) =>
      fetchProducts(
        {
          q: qFromUrl,
          category_id: selectedCategory?.id ?? null,
          limit: 48,
        },
        signal,
      ),
  });

  const products = (productsQuery.data ?? []).filter((p) => p.is_published);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void navigate({
      search: (prev) => ({
        ...prev,
        q: draftQ.trim() || undefined,
      }),
      replace: true,
    });
  }

  function selectCategory(next?: { id: string; slug: string }) {
    void navigate({
      search: (prev) => ({
        ...prev,
        category: next ? next.slug || next.id : undefined,
      }),
      replace: true,
    });
  }

  return (
    <AppShell>
      <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
        <Boxes className="h-4 w-4" /> Каталог
      </div>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Медицинское оборудование и материалы
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
        Список товаров. Категории — в фильтре ниже.
      </p>

      <form onSubmit={onSearchSubmit} className="mt-6 flex gap-2" role="search">
        <label htmlFor="catalog-index-search" className="sr-only">
          Поиск товаров
        </label>
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="catalog-index-search"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Поиск по названию или артикулу"
            className="field-control pl-10"
          />
        </div>
        <button
          type="submit"
          className="h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Найти
        </button>
      </form>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setFilterOpen((open) => !open)}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold"
          aria-expanded={filterOpen}
        >
          <Filter className="h-4 w-4 text-primary" aria-hidden />
          {selectedCategory
            ? `Категория: ${selectedCategory.name}`
            : "Фильтр по категориям"}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              filterOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {filterOpen ? (
          <div className="mt-3 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Категории
              </p>
              {selectedCategory ? (
                <button
                  type="button"
                  onClick={() => selectCategory(undefined)}
                  className="text-xs font-semibold text-primary"
                >
                  Сбросить
                </button>
              ) : null}
            </div>

            <StateBlock
              isLoading={categoriesQuery.isLoading}
              isError={categoriesQuery.isError}
              error={categoriesQuery.error}
              isEmpty={categoriesQuery.isSuccess && tree.length === 0}
              onRetry={() => void categoriesQuery.refetch()}
              emptyTitle="Категории пока пусты"
            >
              <ul className="space-y-3">
                {tree.map((section) => {
                  const sectionActive =
                    selectedCategory?.id === section.id ||
                    selectedCategory?.slug === section.slug;
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() =>
                          selectCategory({
                            id: section.id,
                            slug: section.slug || section.id,
                          })
                        }
                        className={cn(
                          "w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
                          sectionActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/70 hover:bg-primary-soft",
                        )}
                      >
                        {section.name}
                      </button>
                      {section.children.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-2 pl-1">
                          {section.children.map((child) => {
                            const active =
                              selectedCategory?.id === child.id ||
                              selectedCategory?.slug === child.slug;
                            return (
                              <li key={child.id}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    selectCategory({
                                      id: child.id,
                                      slug: child.slug || child.id,
                                    })
                                  }
                                  className={cn(
                                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                                    active
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-background border border-border hover:border-primary/40",
                                  )}
                                >
                                  {child.name}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </StateBlock>
          </div>
        ) : null}
      </div>

      <div className="mt-8 min-h-[40rem]">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Товары</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedCategory?.name ?? "Все опубликованные товары"}
            </p>
          </div>
        </div>

        <StateBlock
          isLoading={productsQuery.isLoading}
          isError={productsQuery.isError}
          error={productsQuery.error}
          isEmpty={productsQuery.isSuccess && products.length === 0}
          onRetry={() => void productsQuery.refetch()}
          loadingVariant="card-grid"
          cardGridVariant="catalog"
          loadingCount={6}
          emptyTitle={
            qFromUrl || selectedCategory ? "Товары не найдены" : "Каталог пока пуст"
          }
          emptyDescription={
            qFromUrl || selectedCategory
              ? "Измените поиск или сбросьте фильтр категорий."
              : "Товары появятся после публикации."
          }
        >
          <ProductGrid products={products} />
        </StateBlock>
      </div>
    </AppShell>
  );
}

function ProductGrid({ products }: { products: ProductListOut[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {products.map((p, index) => (
        <li key={p.id}>
          <Link
            to="/product/$slug"
            params={{ slug: p.slug }}
            className="block overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              {p.primary_image_url ? (
                <img
                  src={p.primary_image_url}
                  alt=""
                  width={800}
                  height={600}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading={index < 2 ? "eager" : "lazy"}
                  decoding="async"
                />
              ) : null}
            </div>
            <div className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {p.sku}
              </p>
              <h3 className="mt-1 font-semibold text-foreground">{p.name_ru}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {[p.manufacturer, p.country].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">
                  {availabilityLabel(p.availability)}
                </span>
                <span className="font-semibold text-primary">
                  {formatMoney(p.price, "По запросу")}
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
