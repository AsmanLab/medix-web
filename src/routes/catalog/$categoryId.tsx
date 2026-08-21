import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { fetchCategories } from "@/api/catalog";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { CatalogSearch } from "@/features/catalog/CatalogSearch";
import { CategoryFilter } from "@/features/catalog/CategoryFilter";
import { useProductPages } from "@/features/catalog/use-product-pages";
import {
  buildCategoryTree,
  collectCategoryIds,
  findCategoryPath,
  type CatalogCategoryNode,
} from "@/features/catalog/map-category";
import { ProductGrid } from "@/features/catalog/ProductGrid";
import { usePageMeta } from "@/lib/page-meta";
import { plural } from "@/lib/plural";
import { cn } from "@/lib/utils";

/**
 * Страница раздела каталога.
 *
 * Адрес — `/catalog/{slug}` для **любого** уровня: slug уникален по всему
 * дереву, поэтому третий уровень получает такую же собственную страницу,
 * как и первый, и индексируется поисковиками наравне с ним.
 *
 * `?subcategory=` остаётся понимаемым, но больше не создаётся: по нему
 * приходят ссылки, разосланные до появления третьего уровня. Двух уровней
 * этому параметру хватало ровно потому, что третьего не было; описать им
 * «Лаборатория → Гематология → Анализаторы» уже нечем.
 */
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

  /**
   * Путь от корня до текущей категории: `[Лаборатория, Гематология,
   * Гематологические анализаторы]`.
   *
   * Старый `?subcategory=` уточняет выбор внутри пути — но только если
   * названный им узел действительно лежит в этом разделе. Иначе параметр
   * игнорируется: чужой slug в адресе не должен уводить со страницы,
   * которую человек открыл.
   */
  const path = useMemo(() => {
    const base = findCategoryPath(tree, categoryId);
    if (!base || !subcategoryFromUrl) return base;
    const legacy = findCategoryPath(tree, subcategoryFromUrl);
    const insideThisSection = legacy?.some((n) => n.id === base.at(-1)?.id);
    return insideThisSection ? legacy : base;
  }, [tree, categoryId, subcategoryFromUrl]);

  const root = path?.[0] ?? null;
  const current = path?.at(-1) ?? null;

  /**
   * Выдача — всё поддерево текущей категории.
   *
   * Товары висят на листьях, а не на разделах: до 17.08 в фильтр уходил
   * один `category_id`, и выбор раздела давал пустую страницу. С третьим
   * уровнем это стало вдвойне заметно — у «Гематологии» своих товаров
   * нет вовсе, они все на «Гематологических анализаторах».
   */
  const productCategoryIds = useMemo(
    () => (current ? collectCategoryIds(current) : []),
    [current],
  );

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
  usePageMeta({
    title: current?.seoTitle || current?.name,
    description: current?.seoDescription,
  });

  // История здесь нужна: выбор категории — переход, и «Назад» должен
  // снимать фильтр, а не выбрасывать из раздела. С `replace: true` кнопка
  // «Назад» уводила на предыдущую страницу, минуя все сделанные выборы.
  function selectCategory(next: CatalogCategoryNode | null) {
    const target = next ?? root;
    if (!target) return;
    void navigate({
      to: "/catalog/$categoryId",
      params: { categoryId: target.slug || target.id },
      // Старый параметр снимаем: адрес уровня теперь и есть сам адрес.
      search: (prev) => ({ ...prev, subcategory: undefined }),
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

  function clearSearch() {
    setDraftQ("");
    // Снимаем запрос и из адресной строки: очистка одного поля оставила бы
    // выдачу отфильтрованной, а форма выглядела бы пустой.
    void navigate({
      search: (prev) => ({ ...prev, q: undefined }),
      replace: true,
    });
  }

  const notFound = categoriesQuery.isSuccess && !path;
  // Сайдбар показывает ветку целиком от корня раздела: с третьим уровнем
  // иначе не видно, где ты находишься — «Анализаторы» без «Гематологии»
  // над ними не значат ничего.
  const hasBranch = (root?.children.length ?? 0) > 0;

  return (
    <AppShell>
      <Link
        to="/catalog"
        search={{ q: undefined, category: undefined }}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary"
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
        {path && root && current ? (
          <div className="mt-6 space-y-8">
            <header>
              {/*
               * Крошки строятся из пути, поэтому длина у них любая.
               * Прежняя версия рисовала ровно два звена, и на третьем
               * уровне корень из них выпадал: «Каталог / Гематология /
               * Анализаторы» — «Лаборатории» не было вовсе.
               */}
              <nav
                aria-label="Хлебные крошки"
                className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
              >
                <Link
                  to="/catalog"
                  search={{ q: undefined, category: undefined }}
                  className="hover:text-primary"
                >
                  Каталог
                </Link>
                {path.map((node, i) => {
                  const isLast = i === path.length - 1;
                  return (
                    <span key={node.id} className="flex items-center gap-2">
                      <span aria-hidden>/</span>
                      {isLast ? (
                        <span className="text-foreground" aria-current="page">
                          {node.name}
                        </span>
                      ) : (
                        <Link
                          to="/catalog/$categoryId"
                          params={{ categoryId: node.slug || node.id }}
                          search={{ subcategory: undefined, q: undefined }}
                          className="hover:text-primary"
                        >
                          {node.name}
                        </Link>
                      )}
                    </span>
                  );
                })}
              </nav>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
                {current.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {current.children.length > 0
                  ? `${plural(current.children.length, "подкатегория", "подкатегории", "подкатегорий")} · выберите направление или смотрите все товары раздела`
                  : "Товары в этом разделе"}
              </p>
            </header>

            {/*
             * Та же раскладка, что в каталоге: дерево раздела постоянной
             * колонкой слева на ПК, кнопкой со шторкой на телефоне.
             */}
            <div
              className={cn(
                hasBranch &&
                  "lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8",
              )}
            >
              {hasBranch ? (
                <CategoryFilter
                  nodes={root.children}
                  selectedId={current.id === root.id ? null : current.id}
                  onSelect={selectCategory}
                  kind="subcategory"
                  // Сброс здесь означает «весь раздел», и у него есть своё
                  // число — в отличие от каталога, где сброс это весь
                  // каталог, а его общего количества API не отдаёт.
                  resetCount={root.productCount}
                />
              ) : null}

              {/* Отступ нужен только когда сверху стоит кнопка фильтра:
                  без подкатегорий интервал уже даёт space-y-8 выше. */}
              <section className={cn(hasBranch && "mt-8 lg:mt-0")}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-display text-xl font-bold">Товары</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {current.id === root.id
                        ? "Все товары раздела"
                        : current.name}
                    </p>
                  </div>
                  <CatalogSearch
                    id="category-product-search"
                    label="Поиск в разделе"
                    placeholder="Поиск в разделе"
                    value={draftQ}
                    appliedValue={qFromUrl ?? ""}
                    onChange={setDraftQ}
                    onClear={clearSearch}
                    onSubmit={onSearchSubmit}
                    className="w-full sm:max-w-md"
                  />
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
                    cardGridClassName={cn(
                      hasBranch && "lg:grid-cols-3 xl:grid-cols-4",
                    )}
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
                          hasBranch && "lg:grid-cols-3 xl:grid-cols-4",
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
