import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchProductBySlug } from "@/api/catalog";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { availabilityLabel } from "@/features/catalog/availability";
import {
  buildConfigKey,
  emptySelection,
  missingRequiredGroups,
  selectedOptionsFromState,
  summarizeConfigPrice,
  type ConfigSelection,
} from "@/features/catalog/configurator-logic";
import { ProductConfigurator } from "@/features/catalog/ProductConfigurator";
import {
  parseUnitPriceAmount,
  rfqCartStore,
  type RfqCartOption,
} from "@/features/rfq/cart-store";

export const Route = createFileRoute("/product/$slug")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: queryKeys.catalog.product(slug),
    queryFn: ({ signal }) => fetchProductBySlug(slug, signal),
    retry: (count, err: unknown) => {
      if (isAppError(err) && err.status === 404) return false;
      return count < 1;
    },
  });

  const product = query.data;
  const groups = product?.option_groups ?? [];
  const [selection, setSelection] = useState<ConfigSelection>(emptySelection);

  useEffect(() => {
    setSelection(emptySelection());
  }, [slug]);

  const selected = useMemo(
    () => selectedOptionsFromState(groups, selection),
    [groups, selection],
  );
  const missing = useMemo(
    () => missingRequiredGroups(groups, selection),
    [groups, selection],
  );
  const summary = useMemo(
    () => summarizeConfigPrice(product?.price ?? null, selected),
    [product?.price, selected],
  );

  const primaryImage =
    product?.images?.find((i) => i.is_primary) ?? product?.images?.[0];

  function addToRfq() {
    if (!product) return;

    if (missing.length > 0) {
      toast.error(
        `Выберите обязательные опции: ${missing.map((g) => g.name_ru).join(", ")}`,
      );
      return;
    }

    const options: RfqCartOption[] = selected.map((o) => ({
      optionId: o.id,
      name: o.name_ru,
      sku: `${product.sku}::${o.id.slice(0, 8)}`,
      optionType: o.option_type,
      priceLabel: o.price,
      unitPriceAmount: parseUnitPriceAmount(o.price),
    }));

    rfqCartStore.add({
      lineKey: buildConfigKey(product.id, selected),
      productId: product.id,
      slug: product.slug,
      sku: product.sku,
      name: product.name_ru,
      // Display: configured total; API base line uses unitPriceAmount only.
      priceLabel: summary.label,
      unitPriceAmount: parseUnitPriceAmount(product.price),
      options,
    });
    toast.success("Добавлено в запрос", {
      action: {
        label: "Корзина",
        onClick: () => {
          void navigate({ to: "/cart" });
        },
      },
    });
  }

  return (
    <AppShell>
      <Link
        to="/catalog"
        search={{ q: undefined }}
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
          loadingVariant="detail"
        >
          {product ? (
            <article className="space-y-6">
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
                {primaryImage?.url ? (
                  <img
                    src={primaryImage.url}
                    alt={product.name_ru}
                    fetchPriority="high"
                    decoding="async"
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
                      {groups.length > 0
                        ? summary.label
                        : product.price
                          ? product.price
                          : "Цена по запросу"}
                    </p>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                      {availabilityLabel(product.availability)}
                    </span>
                  </div>
                  <Button className="mt-5 w-full sm:w-auto" onClick={addToRfq}>
                    <ShoppingCart className="h-4 w-4" />
                    В запрос (RFQ)
                  </Button>
                </div>
              </div>

              {groups.length > 0 ? (
                <ProductConfigurator
                  groups={groups}
                  basePrice={product.price}
                  selection={selection}
                  onSelectionChange={setSelection}
                />
              ) : null}

              {product.description_ru ? (
                <section className="rounded-3xl border border-border bg-card p-5">
                  <h2 className="font-semibold">Описание</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {product.description_ru}
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
