import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Boxes } from "lucide-react";
import { useMemo, useState } from "react";
import { fetchCategories } from "@/api/catalog";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { CatalogSearch } from "@/features/catalog/CatalogSearch";
import { CategoryFilter } from "@/features/catalog/CategoryFilter";
import { ProductGrid } from "@/features/catalog/ProductGrid";
import {
  buildCategoryTree,
  collectCategoryIds,
} from "@/features/catalog/map-category";
import { useProductPages } from "@/features/catalog/use-product-pages";
import { plural } from "@/lib/plural";
import { usePageMeta } from "@/lib/page-meta";

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
  usePageMeta({
    title: "Каталог",
    description:
      "Медицинское оборудование и расходные материалы для клиник Кыргызстана.",
  });

  const { q: qFromUrl, category: categoryFromUrl } = Route.useSearch();
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

  /**
   * Раздел показывается вместе с подкатегориями — так же, как на странице
   * раздела.
   *
   * Раньше здесь уходил один `category_id`, то есть только товары,
   * привязанные к самому разделу. В каталоге заказчика таких нет ни одного:
   * товары висят на подкатегориях, и выбор раздела давал пустую страницу
   * «Товары не найдены». Теперь число у раздела и его выдача — про одно
   * и то же.
   */
  const selectedCategoryIds = useMemo(
    () => (selectedCategory ? collectCategoryIds(selectedCategory) : undefined),
    [selectedCategory],
  );

  const productsQuery = useProductPages({
    q: qFromUrl,
    categoryIds: selectedCategoryIds,
  });
  const products = productsQuery.products;

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

  function clearSearch() {
    setDraftQ("");
    // Снимаем запрос и из адресной строки: очистка одного поля оставила бы
    // выдачу отфильтрованной, а форма выглядела бы пустой.
    void navigate({
      search: (prev) => ({ ...prev, q: undefined }),
      replace: true,
    });
  }

  function selectCategory(next?: { id: string; slug: string }) {
    void navigate({
      search: (prev) => ({
        ...prev,
        category: next ? next.slug || next.id : undefined,
      }),
      // Здесь, в отличие от поиска, история нужна: выбор категории — это
      // переход, и «Назад» должен снимать фильтр, а не выбрасывать из
      // каталога целиком. С `replace: true` кнопка «Назад» уводила
      // на предыдущую страницу, минуя все сделанные выборы.
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
        Медицинское оборудование и расходные материалы. Выберите категорию или
        найдите товар по названию и артикулу.
      </p>

      <CatalogSearch
        id="catalog-index-search"
        label="Поиск товаров"
        placeholder="Поиск по названию или артикулу"
        value={draftQ}
        appliedValue={qFromUrl ?? ""}
        onChange={setDraftQ}
        onClear={clearSearch}
        onSubmit={onSearchSubmit}
        className="mt-6"
      />

      {/*
       * Две колонки на ПК: категории слева постоянной колонкой, товары
       * справа. Фильтр был раскрывающейся панелью над сеткой — она ела
       * высоту, хотя справа пустовала половина ширины, и требовала
       * открыть-закрыть при каждом выборе. На телефоне колонка
       * превращается в кнопку со шторкой, см. CategoryFilter.
       */}
      <div className="mt-4 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <StateBlock
          isLoading={categoriesQuery.isLoading}
          isError={categoriesQuery.isError}
          error={categoriesQuery.error}
          isEmpty={categoriesQuery.isSuccess && tree.length === 0}
          onRetry={() => void categoriesQuery.refetch()}
          emptyTitle="Категории пока пусты"
        >
          <CategoryFilter
            nodes={tree}
            selectedId={selectedCategory?.id ?? null}
            onSelect={(node) => selectCategory(node ?? undefined)}
            kind="category"
          />
        </StateBlock>

        <div className="mt-8 min-h-[40rem] lg:mt-0">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold">Товары</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedCategory?.name ?? "Все опубликованные товары"}
              </p>
            </div>
            {products.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {productsQuery.hasNextPage
                  ? `Показано ${products.length}`
                  : plural(products.length, "товар", "товара", "товаров")}
              </p>
            ) : null}
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
              qFromUrl || selectedCategory
                ? "Товары не найдены"
                : "Каталог пока пуст"
            }
            emptyDescription={
              qFromUrl || selectedCategory
                ? "Измените поиск или сбросьте фильтр категорий."
                : "Товары появятся после публикации."
            }
          >
            <>
              {/*
               * Колонка товаров уже полной ширины на 240px сайдбара, поэтому
               * четвёртая колонка добавляется на xl, а не на lg: иначе на
               * 1024px карточка ужимается до ~160px при расчётных 232–310.
               */}
              <ProductGrid
                products={products}
                className="lg:grid-cols-3 xl:grid-cols-4"
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
      </div>
    </AppShell>
  );
}
