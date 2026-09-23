import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Package,
  Plus,
  Search,
  Star,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  fetchAdminCategories,
  fetchAdminProducts,
  importCatalogFile,
  publishAdminProduct,
  reorderAdminCategoryProducts,
  reorderAdminHomeProducts,
  unpublishAdminProduct,
  type ProductListOut,
} from "@/api/catalog";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { availabilityLabel } from "@/features/catalog/availability";
import { CategoryFilter } from "@/features/catalog/CategoryFilter";
import {
  buildAdminCategoryTree,
  collectCategoryIds,
  findCategoryNode,
} from "@/features/catalog/map-category";
import { requireStaffPanel } from "@/session/guards";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type ProductsSearch = {
  q?: string;
  status?: "published" | "draft";
  category_id?: string;
  /** Режим «На главной»: свой список, свой порядок, своя перестановка. */
  home?: boolean;
};

export const Route = createFileRoute("/admin/catalog/products/")({
  validateSearch: (search: Record<string, unknown>): ProductsSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    status:
      search.status === "published" || search.status === "draft"
        ? search.status
        : undefined,
    category_id:
      typeof search.category_id === "string" ? search.category_id : undefined,
    home: search.home === true ? true : undefined,
  }),
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: AdminProductsPage,
});

/** Ячейка списка: до sm показывает подпись колонки, начиная с sm — только значение. */
function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex items-baseline gap-2 text-xs">
      <span className="w-20 shrink-0 text-muted-foreground sm:hidden">
        {label}
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

function AdminProductsPage() {
  const { q, status, category_id, home } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [draftQ, setDraftQ] = useState(q ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.adminCategories(),
    queryFn: ({ signal }) => fetchAdminCategories(signal),
  });
  const categories = categoriesQuery.data ?? [];

  const tree = useMemo(() => buildAdminCategoryTree(categories), [categories]);

  const selectedNode = useMemo(
    () => (category_id ? findCategoryNode(tree, category_id) : null),
    [tree, category_id],
  );

  // Раздел с подкатегориями показывает всю ветку — так же, как на витрине.
  // Листовая категория (или отсутствие выбора) шлёт её id как раньше.
  const isBranch = Boolean(selectedNode && selectedNode.children.length > 0);
  const selectedCategoryIds = useMemo(
    () => (isBranch && selectedNode ? collectCategoryIds(selectedNode) : null),
    [isBranch, selectedNode],
  );

  const isSearch = !!q?.trim();

  const listParams = useMemo(
    () => ({
      q: q ?? "",
      // «На главной» — свой список независимо от категории и статуса:
      // это витрина блока на главной, а не срез каталога.
      category_id: home ? null : isBranch ? null : (category_id ?? null),
      category_ids: home ? null : selectedCategoryIds,
      is_published:
        !home && status === "published"
          ? true
          : !home && status === "draft"
            ? false
            : null,
      home: home ?? false,
    }),
    [q, category_id, status, home, isBranch, selectedCategoryIds],
  );

  /*
   * Список обрывался на 80 товарах: курсор в API есть, но фронт его не
   * использовал, поэтому в каталоге больше 80 позиций остальные были
   * недоступны — и админка об этом молчала, список просто заканчивался.
   *
   * При непустом `q` сервер сортирует по релевантности, курсор с этим
   * несовместим — листаем через `offset`.
   */
  const effectiveIsSearch = !home && isSearch;
  const listQuery = useInfiniteQuery({
    queryKey: queryKeys.catalog.adminProducts(listParams),
    initialPageParam: null as string | number | null,
    queryFn: ({ pageParam, signal }) =>
      fetchAdminProducts(
        {
          ...listParams,
          cursor: effectiveIsSearch
            ? undefined
            : ((pageParam as string | null) ?? undefined),
          offset: effectiveIsSearch
            ? ((pageParam as number | null) ?? undefined)
            : undefined,
        },
        signal,
      ),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < ADMIN_PRODUCTS_PAGE_SIZE) return undefined;
      return effectiveIsSearch
        ? allPages.flat().length
        : (lastPage.at(-1)?.id ?? undefined);
    },
  });

  /**
   * Полный список товаров на главной — нужен и для счётчика у кнопки
   * «На главной», и чтобы переключатель в обычном режиме мог дописать
   * товар в конец существующего порядка, не зная его целиком заранее.
   * Сервер отдаёт home-список одной страницей (потолок — 100), а курировать
   * блок на главной больше сотни позиций всё равно не имеет смысла.
   */
  const homeListQuery = useQuery({
    queryKey: queryKeys.catalog.adminProducts({ home: true, limit: 100 }),
    queryFn: ({ signal }) =>
      fetchAdminProducts({ home: true, limit: 100 }, signal),
  });
  const homeItems = homeListQuery.data ?? [];

  const publishMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      if (next) await publishAdminProduct(id);
      else await unpublishAdminProduct(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
      toast.success("Статус публикации обновлён");
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось обновить статус");
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => importCatalogFile(file),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
      toast.success(
        `Импорт: создано ${result.created}, обновлено ${result.updated}, ошибок ${result.errors}`,
      );
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось импортировать");
    },
  });

  const items = listQuery.data?.pages.flat() ?? [];

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.id, c.name_ru);
    return map;
  }, [categories]);

  /**
   * Стрелки порядка бэкенд поддерживает только для выборки по ровно одной
   * категории без подветки и без поиска — это ограничение `product_categories.sort`
   * (`POST /admin/catalog/categories/{id}/products/reorder`). При выборе
   * раздела целиком или в поиске переставлять нечего: порядок или уже задан
   * деревом категорий, или всё равно перезапишется при рефетче.
   */
  const canReorderByCategory =
    !home && Boolean(category_id) && !isBranch && !isSearch;
  const canReorderHome = home;
  const canReorder = canReorderByCategory || canReorderHome;

  const reorderMutation = useMutation({
    mutationFn: (updates: { product_id: string; sort: number }[]) =>
      reorderAdminCategoryProducts(category_id!, updates),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
      toast.success("Порядок обновлён");
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось изменить порядок");
    },
  });

  const homeMutation = useMutation({
    mutationFn: (updates: { product_id: string; sort: number }[]) =>
      reorderAdminHomeProducts(updates),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
      toast.success("Главная обновлена");
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось обновить главную");
    },
  });

  /**
   * Переставляет только уже загруженные строки — как и в дереве категорий,
   * перенос через границу ещё не подгруженной страницы не поддержан.
   */
  function moveProduct(productId: string, direction: -1 | 1) {
    const index = items.findIndex((p) => p.id === productId);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= items.length) return;
    const reordered = items.slice();
    const tmp = reordered[index]!;
    reordered[index] = reordered[swapIndex]!;
    reordered[swapIndex] = tmp;

    if (home) {
      homeMutation.mutate(
        reordered.map((p, i) => ({ product_id: p.id, sort: i })),
      );
    } else {
      reorderMutation.mutate(
        reordered.map((p, i) => ({ product_id: p.id, sort: i })),
      );
    }
  }

  /** Убрать товар с главной, сохранив порядок остальных. */
  function removeFromHome(productId: string) {
    const remaining = homeItems.filter((p) => p.id !== productId);
    homeMutation.mutate(
      remaining.map((p, i) => ({ product_id: p.id, sort: i })),
    );
  }

  /** Добавить товар на главную — в конец текущего порядка. */
  function addToHome(product: ProductListOut) {
    const next = [
      ...homeItems.map((p, i) => ({ product_id: p.id, sort: i })),
      { product_id: product.id, sort: homeItems.length },
    ];
    homeMutation.mutate(next);
  }

  function toggleHome(product: ProductListOut, next: boolean) {
    if (next) addToHome(product);
    else removeFromHome(product.id);
  }

  function selectCategory(nodeId: string | null) {
    void navigate({
      search: (prev) => ({
        ...prev,
        category_id: nodeId ?? undefined,
        home: undefined,
      }),
    });
  }

  function toggleHomeMode() {
    void navigate({
      search: (prev) => ({
        ...prev,
        home: home ? undefined : true,
      }),
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
            <Package className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Товары</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length
                ? `${items.length}${listQuery.hasNextPage ? "+" : ""} в выборке · черновики и опубликованные`
                : "Каталог товаров"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) importMutation.mutate(file);
            }}
          />
          <button
            type="button"
            disabled={importMutation.isPending}
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold"
          >
            <Upload className="h-4 w-4" aria-hidden />
            {importMutation.isPending ? "Импорт…" : "Импорт CSV/XLSX"}
          </button>
          <Link
            to="/admin/catalog/products/new"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Создать
          </Link>
        </div>
      </header>

      {/*
       * Дерево слева, товары справа — тот же каркас, что на витрине.
       * `minmax(0,1fr)`, а не `1fr`: без этого колонка товаров раздувается
       * под длинное содержимое и разносит страницу по горизонтали.
       */}
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="mb-4 lg:sticky lg:top-24 lg:mb-0">
          <button
            type="button"
            onClick={toggleHomeMode}
            aria-pressed={home}
            className={cn(
              "mb-2 flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 text-left text-sm font-semibold transition",
              home
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-card text-foreground hover:bg-secondary/70",
            )}
          >
            <Star
              className={cn("h-4 w-4", home && "fill-primary")}
              aria-hidden
            />
            На главной{" "}
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              {homeListQuery.isSuccess ? homeItems.length : "…"}
            </span>
          </button>

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
              selectedId={home ? null : (category_id ?? null)}
              onSelect={(node) => selectCategory(node?.id ?? null)}
              kind="category"
            />
          </StateBlock>
        </div>

        <div className="mt-4 space-y-3 lg:mt-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <form
              className="relative min-w-[220px] flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    q: draftQ.trim() || undefined,
                  }),
                  replace: true,
                });
              }}
            >
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                value={draftQ}
                onChange={(e) => setDraftQ(e.target.value)}
                placeholder="Поиск: название, SKU, производитель"
                className="h-11 w-full rounded-xl border border-border bg-background pr-3 pl-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </form>
            {!home ? (
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "all", label: "Все" },
                    { value: "published", label: "Опубликованные" },
                    { value: "draft", label: "Черновики" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() =>
                      void navigate({
                        search: (prev) => ({
                          ...prev,
                          status: tab.value === "all" ? undefined : tab.value,
                        }),
                      })
                    }
                    className={cn(
                      "h-9 rounded-lg px-3 text-xs font-semibold",
                      (status ?? "all") === tab.value
                        ? "bg-primary-soft text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {isBranch ? (
            <p className="text-xs text-muted-foreground">
              Показаны товары всего раздела «{selectedNode?.name}» вместе с
              подкатегориями. Чтобы менять порядок стрелками, выберите
              конкретную подкатегорию.
            </p>
          ) : null}

          <StateBlock
            isLoading={listQuery.isLoading}
            isError={listQuery.isError}
            error={listQuery.error}
            onRetry={() => void listQuery.refetch()}
            isEmpty={!listQuery.isLoading && items.length === 0}
            loadingVariant="list"
            emptyIcon={Package}
            emptyTitle={home ? "На главной пока пусто" : "Товаров нет"}
            emptyDescription={
              home
                ? "Отметьте товары переключателем «На главную» в обычном списке."
                : "Создайте товар или загрузите CSV/XLSX."
            }
            emptyAction={
              home ? undefined : (
                <Link
                  to="/admin/catalog/products/new"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Создать товар
                </Link>
              )
            }
          >
            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              <div
                className={cn(
                  "hidden border-b border-border bg-muted/40 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:grid",
                  canReorder
                    ? isBranch || category_id
                      ? "grid-cols-[28px_1fr_100px_120px_110px_90px_90px]"
                      : "grid-cols-[28px_1fr_140px_100px_120px_110px_90px]"
                    : isBranch || category_id
                      ? "grid-cols-[1fr_100px_120px_110px_90px_90px]"
                      : "grid-cols-[1fr_140px_100px_120px_110px_90px]",
                )}
              >
                {canReorder ? <span className="sr-only">Порядок</span> : null}
                <span>Название</span>
                {/* При выбранной категории у всех товаров один и тот же путь —
                    колонка избыточна, освобождаем ширину названию. */}
                {!category_id ? <span>Категории</span> : null}
                <span>SKU</span>
                <span>Наличие</span>
                <span>Цена</span>
                <span>Статус</span>
                <span>Главная</span>
              </div>
              {/*
                На мобильном строка складывалась в столбик, но заголовки колонок
                остаются скрытыми — было видно «MED-001 / В наличии / 50 000 сом»
                без единой подписи, и понять, что есть что, можно было только
                по догадке. Ниже sm подписи выводятся рядом со значением.
              */}
              {items.map((p, index) => (
                <div
                  key={p.id}
                  className={cn(
                    "grid gap-2 border-b border-border px-4 py-3 last:border-0 sm:items-center",
                    canReorder
                      ? category_id
                        ? "sm:grid-cols-[28px_1fr_100px_120px_110px_90px_90px]"
                        : "sm:grid-cols-[28px_1fr_140px_100px_120px_110px_90px]"
                      : category_id
                        ? "sm:grid-cols-[1fr_100px_120px_110px_90px_90px]"
                        : "sm:grid-cols-[1fr_140px_100px_120px_110px_90px]",
                  )}
                >
                  {canReorder ? (
                    <div className="flex shrink-0 flex-row gap-1 sm:flex-col sm:gap-0">
                      <button
                        type="button"
                        aria-label="Переместить выше"
                        disabled={
                          index === 0 ||
                          reorderMutation.isPending ||
                          homeMutation.isPending
                        }
                        onClick={() => moveProduct(p.id, -1)}
                        className="grid h-6 w-6 place-items-center text-muted-foreground disabled:opacity-30 sm:h-4 sm:w-5"
                      >
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label="Переместить ниже"
                        disabled={
                          index === items.length - 1 ||
                          reorderMutation.isPending ||
                          homeMutation.isPending
                        }
                        onClick={() => moveProduct(p.id, 1)}
                        className="grid h-6 w-6 place-items-center text-muted-foreground disabled:opacity-30 sm:h-4 sm:w-5"
                      >
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <Link
                      to="/admin/catalog/products/$productId"
                      params={{ productId: p.id }}
                      title={p.name_ru}
                      className="block truncate text-sm font-semibold hover:text-primary"
                    >
                      {p.name_ru}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.manufacturer || "—"} · {p.slug}
                    </p>
                  </div>
                  {!category_id ? (
                    <Cell label="Категории">
                      {p.category_ids.length
                        ? p.category_ids
                            .map((id) => categoryNameById.get(id) ?? null)
                            .filter((name): name is string => Boolean(name))
                            .join(", ") || "—"
                        : "—"}
                    </Cell>
                  ) : null}
                  <Cell label="SKU">
                    <span className="font-mono">{p.sku}</span>
                  </Cell>
                  <Cell label="Наличие">{availabilityLabel(p.availability)}</Cell>
                  <Cell label="Цена">{formatMoney(p.price, "по запросу")}</Cell>
                  <label className="flex min-h-11 items-center gap-2 text-xs sm:min-h-0">
                    <span className="w-20 shrink-0 text-muted-foreground sm:hidden">
                      Статус
                    </span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={p.is_published}
                      disabled={publishMutation.isPending}
                      onChange={(e) =>
                        publishMutation.mutate({
                          id: p.id,
                          next: e.target.checked,
                        })
                      }
                    />
                    {/* Было «Pub» / «Draft» — английские сокращения в русской
                        админке, которой пользуются сотрудники заказчика. */}
                    {p.is_published ? "Опубликован" : "Черновик"}
                  </label>
                  {home ? (
                    <button
                      type="button"
                      disabled={homeMutation.isPending}
                      onClick={() => removeFromHome(p.id)}
                      className="flex min-h-11 items-center gap-1 text-xs font-semibold text-destructive sm:min-h-0"
                    >
                      Убрать
                    </button>
                  ) : (
                    <label className="flex min-h-11 items-center gap-2 text-xs sm:min-h-0">
                      <span className="w-20 shrink-0 text-muted-foreground sm:hidden">
                        Главная
                      </span>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={p.home_sort !== null && p.home_sort !== undefined}
                        disabled={homeMutation.isPending || !homeListQuery.isSuccess}
                        onChange={(e) => toggleHome(p, e.target.checked)}
                      />
                      На главную
                    </label>
                  )}
                </div>
              ))}
              {listQuery.hasNextPage ? (
                <div className="flex justify-center border-t border-border p-4">
                  <button
                    type="button"
                    disabled={listQuery.isFetchingNextPage}
                    onClick={() => void listQuery.fetchNextPage()}
                    className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-5 text-sm font-semibold disabled:opacity-60"
                  >
                    {listQuery.isFetchingNextPage ? "Загружаем…" : "Показать ещё"}
                  </button>
                </div>
              ) : null}
            </div>
          </StateBlock>
        </div>
      </div>
    </div>
  );
}
