import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Package, Plus, Search, Upload } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  fetchAdminCategories,
  fetchAdminProducts,
  importCatalogFile,
  publishAdminProduct,
  unpublishAdminProduct,
} from "@/api/catalog";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { availabilityLabel } from "@/features/catalog/availability";
import { requireStaffPanel } from "@/session/guards";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type ProductsSearch = {
  q?: string;
  status?: "published" | "draft";
  category_id?: string;
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
  const { q, status, category_id } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [draftQ, setDraftQ] = useState(q ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  const listParams = useMemo(
    () => ({
      q: q ?? "",
      category_id: category_id ?? null,
      is_published:
        status === "published" ? true : status === "draft" ? false : null,
    }),
    [q, status, category_id],
  );

  /*
   * Список обрывался на 80 товарах: курсор в API есть, но фронт его не
   * использовал, поэтому в каталоге больше 80 позиций остальные были
   * недоступны — и админка об этом молчала, список просто заканчивался.
   */
  const listQuery = useInfiniteQuery({
    queryKey: queryKeys.catalog.adminProducts(listParams),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      fetchAdminProducts({ ...listParams, cursor: pageParam }, signal),
    getNextPageParam: (lastPage) =>
      lastPage.length < ADMIN_PRODUCTS_PAGE_SIZE
        ? undefined
        : (lastPage.at(-1)?.id ?? undefined),
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.adminCategories(),
    queryFn: ({ signal }) => fetchAdminCategories(signal),
  });

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
  const categories = categoriesQuery.data ?? [];

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
                  replace: true,
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
        <select
          value={category_id ?? ""}
          onChange={(e) =>
            void navigate({
              search: (prev) => ({
                ...prev,
                category_id: e.target.value || undefined,
              }),
              replace: true,
            })
          }
          className="field-control sm:w-auto"
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_ru}
            </option>
          ))}
        </select>
      </div>

      <StateBlock
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        error={listQuery.error}
        onRetry={() => void listQuery.refetch()}
        isEmpty={!listQuery.isLoading && items.length === 0}
        loadingVariant="list"
        emptyIcon={Package}
        emptyTitle="Товаров нет"
        emptyDescription="Создайте товар или загрузите CSV/XLSX."
        emptyAction={
          <Link
            to="/admin/catalog/products/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Создать товар
          </Link>
        }
      >
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="hidden grid-cols-[1fr_100px_120px_110px_90px] border-b border-border bg-muted/40 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Название</span>
            <span>SKU</span>
            <span>Наличие</span>
            <span>Цена</span>
            <span>Статус</span>
          </div>
          {/*
            На мобильном строка складывалась в столбик, но заголовки колонок
            остаются скрытыми — было видно «MED-001 / В наличии / 50 000 сом»
            без единой подписи, и понять, что есть что, можно было только
            по догадке. Ниже sm подписи выводятся рядом со значением.
          */}
          {items.map((p) => (
            <div
              key={p.id}
              className="grid gap-2 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-[1fr_100px_120px_110px_90px] sm:items-center"
            >
              <div className="min-w-0">
                <Link
                  to="/admin/catalog/products/$productId"
                  params={{ productId: p.id }}
                  className="truncate text-sm font-semibold hover:text-primary"
                >
                  {p.name_ru}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {p.manufacturer || "—"} · {p.slug}
                </p>
              </div>
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
  );
}
