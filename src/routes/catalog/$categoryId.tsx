import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { fetchCategories } from "@/api/catalog";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { CategoryFilter } from "@/features/catalog/CategoryFilter";
import { useProductPages } from "@/features/catalog/use-product-pages";
import {
  buildCategoryTree,
  collectCategoryIds,
  findCategoryNode,
  type CatalogCategoryNode,
} from "@/features/catalog/map-category";
import { ProductGrid } from "@/features/catalog/ProductGrid";
import { usePageMeta } from "@/lib/page-meta";
import { plural } from "@/lib/plural";
import { cn } from "@/lib/utils";

type CategorySearch = {
  subcategory?: string;
  q?: string;
};

export const Route = createFileRoute("/catalog/$categoryId")({
  validateSearch: (search: Record<string, unknown>): CategorySearch => ({
    subcategory:
      typeof search.subcategory === "string" ? search.subcategory : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { categoryId } = Route.useParams();
  const { subcategory: subcategoryFromUrl, q: qFromUrl } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [draftQ, setDraftQ] = useState(qFromUrl ?? "");

  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: ({ signal }) => fetchCategories(signal),
  });

  const tree = useMemo(
    () => buildCategoryTree(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );

  const resolved = useMemo(
    () => findCategoryNode(tree, categoryId),
    [categoryId, tree],
  );

  const section: CatalogCategoryNode | null = resolved
    ? (resolved.parent ?? resolved.node)
    : null;

  const selectedChild = useMemo(() => {
    if (!resolved || !section) return null;
    if (resolved.parent) {
      return resolved.node;
    }
    if (!subcategoryFromUrl) return null;
    return (
      section.children.find(
        (c) => c.id === subcategoryFromUrl || c.slug === subcategoryFromUrl,
      ) ?? null
    );
  }, [resolved, section, subcategoryFromUrl]);

  const productCategoryIds = useMemo(() => {
    if (!resolved) return [];
    if (selectedChild) return [selectedChild.id];
    if (resolved.parent) return [resolved.node.id];
    return collectCategoryIds(resolved.node);
  }, [resolved, selectedChild]);

  /*
   * Раздел грузился N параллельными запросами (по одному на категорию)
   * со склейкой на клиенте: листать такую выдачу было нельзя, и товары
   * обрывались на первой странице каждой категории. Теперь один запрос
   * с `category_ids` и общим курсором.
   */
  const productsQuery = useProductPages({
    q: qFromUrl,
    categoryIds: productCategoryIds,
    enabled: productCategoryIds.length > 0,
  });
  const products = productsQuery.products;

  // seo_title/seo_description заполняются в админке для каждой категории —
  // до сих пор они никуда не попадали.
  const metaSource = selectedChild ?? section;
  usePageMeta({
    title: metaSource?.seoTitle || metaSource?.name,
    description: metaSource?.seoDescription,
  });

  function selectSubcategory(next?: CatalogCategoryNode) {
    if (!section) return;
    if (!next) {
      void navigate({
        to: "/catalog/$categoryId",
        params: { categoryId: section.slug || section.id },
        search: (prev) => ({ ...prev, subcategory: undefined }),
        replace: true,
      });
      return;
    }
    void navigate({
      to: "/catalog/$categoryId",
      params: { categoryId: section.slug || section.id },
      search: (prev) => ({
        ...prev,
        subcategory: next.slug || next.id,
      }),
      replace: true,
    });
  }

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

  const notFound = categoriesQuery.isSuccess && !resolved;

  return (
    <AppShell>
      <Link
        to="/catalog"
        search={{ q: undefined, category: undefined }}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <ArrowLeft className="h-4 w-4" />К каталогу
      </Link>

      <StateBlock
        isLoading={categoriesQuery.isLoading}
        isError={categoriesQuery.isError}
        error={categoriesQuery.error}
        isEmpty={notFound}
        onRetry={() => void categoriesQuery.refetch()}
        loadingVariant="detail"
        emptyTitle="Категория не найдена"
        emptyDescription="Проверьте ссылку или вернитесь в каталог."
      >
        {resolved && section ? (
          <div className="mt-6 space-y-8">
            <header>
              <nav className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Link
                  to="/catalog"
                  search={{ q: undefined, category: undefined }}
                  className="hover:text-primary"
                >
                  Каталог
                </Link>
                <span>/</span>
                <span className="text-foreground">{section.name}</span>
                {selectedChild ? (
                  <>
                    <span>/</span>
                    <span className="text-foreground">
                      {selectedChild.name}
                    </span>
                  </>
                ) : null}
              </nav>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
                {selectedChild?.name ?? section.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {section.children.length > 0
                  ? `${plural(section.children.length, "подкатегория", "подкатегории", "подкатегорий")} · выберите направление или смотрите все товары раздела`
                  : "Товары в этом разделе"}
              </p>
            </header>

            {/*
             * Та же раскладка, что в каталоге: подкатегории постоянной
             * колонкой слева на ПК, кнопкой со шторкой на телефоне.
             */}
            <div
              className={cn(
                section.children.length > 0 &&
                  "lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8",
              )}
            >
              {section.children.length > 0 ? (
                <CategoryFilter
                  nodes={section.children}
                  selectedId={selectedChild?.id ?? null}
                  onSelect={(node) => selectSubcategory(node ?? undefined)}
                  kind="subcategory"
                />
              ) : null}

              {/* Отступ нужен только когда сверху стоит кнопка фильтра:
                  без подкатегорий интервал уже даёт space-y-8 выше. */}
              <section
                className={cn(section.children.length > 0 && "mt-8 lg:mt-0")}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-display text-xl font-bold">Товары</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedChild?.name ?? "Все товары раздела"}
                    </p>
                  </div>
                  <form
                    onSubmit={onSearchSubmit}
                    role="search"
                    className="flex w-full gap-2 sm:max-w-md"
                  >
                    <label
                      htmlFor="category-product-search"
                      className="sr-only"
                    >
                      Поиск в разделе
                    </label>
                    <div className="relative min-w-0 flex-1">
                      <Search
                        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <input
                        id="category-product-search"
                        value={draftQ}
                        onChange={(e) => setDraftQ(e.target.value)}
                        placeholder="Поиск в разделе"
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
                </div>

                <div className="mt-5">
                  <StateBlock
                    isLoading={productsQuery.isLoading}
                    isError={productsQuery.isError}
                    error={productsQuery.error}
                    isEmpty={productsQuery.isSuccess && products.length === 0}
                    onRetry={() => void productsQuery.refetch()}
                    loadingVariant="card-grid"
                    cardGridVariant="catalog"
                    loadingCount={6}
                    emptyTitle="Товары не найдены"
                    emptyDescription="Измените поиск или выберите другую подкатегорию."
                  >
                    <>
                      {/* Четвёртая колонка с xl: на lg сайдбар ужимает
                        карточку ниже расчётных 232px. */}
                      <ProductGrid
                        products={products}
                        className={cn(
                          section.children.length > 0 &&
                            "lg:grid-cols-3 xl:grid-cols-4",
                        )}
                      />
                      {productsQuery.hasNextPage ? (
                        <div className="mt-8 flex justify-center">
                          <Button
                            variant="outline"
                            size="lg"
                            disabled={productsQuery.isFetchingNextPage}
                            onClick={() => void productsQuery.fetchNextPage()}
                          >
                            {productsQuery.isFetchingNextPage
                              ? "Загружаем…"
                              : "Показать ещё"}
                          </Button>
                        </div>
                      ) : null}
                    </>
                  </StateBlock>
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </StateBlock>
    </AppShell>
  );
}
