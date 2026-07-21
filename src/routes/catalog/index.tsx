import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Boxes, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { fetchCategories } from "@/api/catalog";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { buildCategoryTree } from "@/features/catalog/map-category";

type CatalogSearch = {
  q?: string;
};

export const Route = createFileRoute("/catalog/")({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  component: CatalogIndexPage,
});

function CatalogIndexPage() {
  const { q: qFromUrl } = Route.useSearch();
  const [draftQ, setDraftQ] = useState(qFromUrl ?? "");
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: ({ signal }) => fetchCategories(signal),
  });

  const tree = useMemo(
    () => buildCategoryTree(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );

  const normalized = (qFromUrl ?? "").trim().toLocaleLowerCase("ru");
  const filtered = useMemo(() => {
    return tree
      .map((category) => ({
        ...category,
        children: normalized
          ? category.children.filter((child) =>
              child.name.toLocaleLowerCase("ru").includes(normalized),
            )
          : category.children,
      }))
      .filter(
        (category) =>
          !normalized ||
          category.name.toLocaleLowerCase("ru").includes(normalized) ||
          category.children.length > 0,
      );
  }, [normalized, tree]);

  const navigate = Route.useNavigate();

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void navigate({
      search: { q: draftQ.trim() || undefined },
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
        Выберите направление, затем нужную подкатегорию.
      </p>

      <form onSubmit={onSearchSubmit} className="mt-6 flex gap-2" role="search">
        <label htmlFor="catalog-index-search" className="sr-only">
          Поиск категории или подкатегории
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
            placeholder="Найти категорию или подкатегорию"
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

      <div className="mt-8">
        <StateBlock
          isLoading={categoriesQuery.isLoading}
          isError={categoriesQuery.isError}
          error={categoriesQuery.error}
          isEmpty={categoriesQuery.isSuccess && filtered.length === 0}
          onRetry={() => void categoriesQuery.refetch()}
          loadingVariant="card-grid"
          cardGridVariant="catalog"
          loadingCount={4}
          emptyTitle={normalized ? "Разделы не найдены" : "Категории пока не опубликованы"}
          emptyDescription={
            normalized
              ? "Измените запрос или откройте раздел без фильтра."
              : "Добавьте категории в админ-панели."
          }
        >
          <ul className="grid gap-4 sm:grid-cols-2">
            {filtered.map((category) => (
              <li key={category.id}>
                <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
                  <Link
                    to="/catalog/$categoryId"
                    params={{ categoryId: category.slug || category.id }}
                    search={{ subcategory: undefined, q: undefined }}
                    className="group flex gap-4 border-b border-border p-4"
                  >
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg font-bold text-primary">
                      {category.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1 self-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {category.children.length} подкатегорий
                      </p>
                      <h2 className="mt-1 font-display text-lg font-bold leading-snug">
                        {category.name}
                      </h2>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-primary">
                        Открыть раздел <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      setOpenCategoryId((current) =>
                        current === category.id ? null : category.id,
                      )
                    }
                    className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-primary sm:hidden"
                    aria-expanded={openCategoryId === category.id}
                  >
                    {openCategoryId === category.id
                      ? "Скрыть подкатегории"
                      : `Показать подкатегории · ${category.children.length}`}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${openCategoryId === category.id ? "rotate-180" : ""}`}
                    />
                  </button>

                  <div
                    className={`grid-cols-1 gap-1 border-t border-border p-3 sm:grid sm:grid-cols-2 ${
                      openCategoryId === category.id ? "grid" : "hidden sm:grid"
                    }`}
                  >
                    {category.children.length === 0 ? (
                      <p className="px-2 py-2 text-xs text-muted-foreground sm:col-span-2">
                        Подкатегорий нет — товары появятся в разделе.
                      </p>
                    ) : (
                      category.children.map((child) => (
                        <Link
                          key={child.id}
                          to="/catalog/$categoryId"
                          params={{ categoryId: child.slug || child.id }}
                          search={{ subcategory: undefined, q: undefined }}
                          className="rounded-xl px-2.5 py-2.5 text-sm transition hover:bg-primary-soft hover:text-primary"
                        >
                          {child.name}
                        </Link>
                      ))
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </StateBlock>
      </div>
    </AppShell>
  );
}
