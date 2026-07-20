import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { fetchProductBySlug } from "@/api/catalog";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";

export const Route = createFileRoute("/catalog/$slug")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const query = useQuery({
    queryKey: queryKeys.catalog.product(slug),
    queryFn: ({ signal }) => fetchProductBySlug(slug, signal),
    retry: (count, err: unknown) => {
      if (isAppError(err) && err.status === 404) return false;
      return count < 1;
    },
  });

  const product = query.data;
  const primaryImage =
    product?.images?.find((i) => i.is_primary) ?? product?.images?.[0];

  return (
    <AppShell>
      <Link
        to="/catalog"
        search={{ q: undefined, category: undefined }}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <ArrowLeft className="h-4 w-4" />К каталогу
      </Link>

      <div className="mt-6">
        <StateBlock
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={() => void query.refetch()}
        >
          {product ? (
            <article className="space-y-6">
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
                {primaryImage?.url ? (
                  <img
                    src={primaryImage.url}
                    alt={product.name_ru}
                    className="aspect-[16/9] w-full object-cover"
                  />
                ) : (
                  <div className="grid aspect-[16/9] place-items-center bg-primary-soft text-sm text-muted-foreground">
                    Нет изображения
                  </div>
                )}
                <div className="p-5 sm:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {product.sku}
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
                    {product.name_ru}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {[product.manufacturer, product.country]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                    <p className="text-2xl font-bold text-primary">
                      {product.price
                        ? `${product.price} сом`
                        : "Цена по запросу"}
                    </p>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                      {availabilityLabel(product.availability)}
                    </span>
                  </div>
                </div>
              </div>

              {product.description_ru ? (
                <section className="rounded-3xl border border-border bg-card p-5">
                  <h2 className="font-semibold">Описание</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {product.description_ru}
                  </p>
                </section>
              ) : null}

              {product.option_groups?.length ? (
                <section className="rounded-3xl border border-border bg-card p-5">
                  <h2 className="font-semibold">Опции конфигурации</h2>
                  <ul className="mt-3 space-y-4">
                    {product.option_groups.map((group) => (
                      <li key={group.id}>
                        <p className="text-sm font-medium">{group.name_ru}</p>
                        <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                          {group.options
                            .filter((o) => o.is_active)
                            .map((o) => (
                              <li key={o.id}>
                                {o.name_ru}
                                {o.price ? ` — ${o.price} сом` : ""}
                                {o.is_required ? " (обяз.)" : ""}
                              </li>
                            ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Полный конфигуратор и RFQ — в следующих задачах.
                  </p>
                </section>
              ) : null}

              {product.documents?.length ? (
                <section className="rounded-3xl border border-border bg-card p-5">
                  <h2 className="font-semibold">Документы</h2>
                  <ul className="mt-2 space-y-2">
                    {product.documents.map((doc) => (
                      <li key={doc.id}>
                        {doc.url ? (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-primary"
                          >
                            {doc.name}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {doc.name}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </article>
          ) : null}
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
