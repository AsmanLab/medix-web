import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { addToCart } from "@/api/cart";
import { fetchProductBySlug } from "@/api/catalog";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { availabilityLabel } from "@/features/catalog/availability";
import {
  emptySelection,
  missingRequiredGroups,
  selectedOptionsFromState,
  summarizeConfigPrice,
  type ConfigSelection,
} from "@/features/catalog/configurator-logic";
import { ProductConfigurator } from "@/features/catalog/ProductConfigurator";
import { useSession } from "@/session/store";

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
  const [qty, setQty] = useState(1);
  const session = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    setSelection(emptySelection());
    setQty(1);
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

  const addMutation = useMutation({
    mutationFn: () =>
      addToCart({
        productId: product!.id,
        qty,
        optionIds: selected.map((o) => o.id),
      }),
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart.detail(), cart);
      toast.success("Добавлено в корзину", {
        action: {
          label: "Корзина",
          onClick: () => {
            void navigate({ to: "/cart" });
          },
        },
      });
    },
    onError: (err) =>
      toast.error(
        isAppError(err) ? err.message : "Не удалось добавить в корзину",
      ),
  });

  async function addToCartClick() {
    if (!product) return;

    // Корзина хранится на сервере, поэтому анонимному пользователю её негде
    // держать — отправляем на вход и возвращаем обратно на карточку.
    if (session.status !== "authenticated") {
      toast.message("Войдите, чтобы добавить товар в корзину");
      await navigate({
        to: "/login",
        search: { redirect: `/product/${slug}`, phone: undefined },
      });
      return;
    }

    if (missing.length > 0) {
      toast.error(
        `Выберите обязательные опции: ${missing.map((g) => g.name_ru).join(", ")}`,
      );
      return;
    }

    addMutation.mutate();
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
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center rounded-xl border border-border">
                      <button
                        type="button"
                        aria-label="Уменьшить количество"
                        disabled={qty <= 1}
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="px-3 py-2 text-muted-foreground disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" aria-hidden />
                      </button>
                      <span
                        aria-live="polite"
                        className="min-w-10 text-center text-sm font-semibold"
                      >
                        {qty}
                      </span>
                      <button
                        type="button"
                        aria-label="Увеличить количество"
                        onClick={() => setQty((q) => q + 1)}
                        className="px-3 py-2 text-muted-foreground"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <Button
                      className="w-full sm:w-auto"
                      disabled={addMutation.isPending}
                      onClick={addToCartClick}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {addMutation.isPending ? "Добавляем…" : "В корзину"}
                    </Button>
                  </div>
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
