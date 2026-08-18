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
import { StatusPill } from "@/components/ui/status-pill";
import {
  availabilityLabel,
  availabilityTone,
} from "@/features/catalog/availability";
import {
  emptySelection,
  missingRequiredGroups,
  selectedOptionsFromState,
  summarizeConfigPrice,
  type ConfigSelection,
} from "@/features/catalog/configurator-logic";
import { ProductConfigurator } from "@/features/catalog/ProductConfigurator";
import { ProductDescription } from "@/features/catalog/ProductDescription";
import { ProductDocuments } from "@/features/catalog/ProductDocuments";
import { ProductGallery } from "@/features/catalog/ProductGallery";
import { ProductTabs, type ProductTab } from "@/features/catalog/ProductTabs";
import { ProductVideo } from "@/features/catalog/ProductVideo";
import { parseVideoUrl } from "@/features/catalog/video-url";
import { formatPrice } from "@/lib/money";
import { usePageMeta } from "@/lib/page-meta";
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

  // Ссылка приходит из админки строкой; неопознанную площадку и мусор
  // parseVideoUrl отдаёт как null, и вкладка «Видео» просто не появляется.
  const video = useMemo(
    () => parseVideoUrl(product?.video_url),
    [product?.video_url],
  );

  // Пустые разделы во вкладки не попадают: ярлык, за которым ничего нет,
  // читается как поломка страницы.
  const tabs = useMemo<ProductTab[]>(() => {
    if (!product) return [];
    const list: ProductTab[] = [];

    if (product.description_ru) {
      list.push({
        key: "specs",
        label: "Технические характеристики",
        shortLabel: "Характеристики",
        content: <ProductDescription text={product.description_ru} bare />,
      });
    }
    if (product.documents?.length) {
      list.push({
        key: "docs",
        label: "Документация",
        content: <ProductDocuments documents={product.documents} />,
      });
    }
    if (video) {
      list.push({
        key: "video",
        label: "Видео",
        content: <ProductVideo video={video} title={product.name_ru} />,
      });
    }
    return list;
  }, [product, video]);

  // В описание берём производителя, страну и артикул, а не description_ru:
  // он размечен и хранит характеристики списком — в сниппете это мусор.
  usePageMeta({
    title: product?.name_ru,
    description: product
      ? [product.manufacturer, product.country, `Артикул ${product.sku}`]
          .filter(Boolean)
          .join(" · ")
      : null,
  });

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
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary"
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
            /*
             * Две колонки на десктопе: слева название, фотография и вкладки,
             * справа — липкий блок покупки. Карточка была одноколоночной на
             * любом экране, поэтому на 1920px под галереей во весь контейнер
             * шли цена и «В корзину», а до кнопки после чтения описания
             * приходилось скроллить обратно вверх.
             *
             * `order-*` действует только во флексе (мобильная раскладка),
             * `col-start`/`row-start` — только в гриде (десктоп). Благодаря
             * этому блок покупки стоит сразу под галереей на телефоне и в
             * правой колонке на десктопе, оставаясь одним узлом DOM:
             * дублировать его ради раскладки значило бы завести две кнопки
             * «В корзину».
             */
            <article className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(320px,26vw,380px)] lg:[grid-template-rows:auto_auto_1fr] lg:items-start lg:gap-8">
              {/* Название над фотографией, а не внутри блока покупки: это
                  заголовок страницы, и читать его сбоку от картинки
                  неестественно. */}
              <header className="order-1 lg:col-start-1 lg:row-start-1">
                <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
                  {product.sku}
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
                  {product.name_ru}
                </h1>
                {product.manufacturer || product.country ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {[product.manufacturer, product.country]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </header>

              {/* Ширина фотографии ограничена: во всю левую колонку кадр
                  занимал ~900px, и вкладки с характеристиками уходили
                  за пределы первого экрана. */}
              <div className="order-2 overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)] lg:col-start-1 lg:row-start-2 lg:max-w-[600px]">
                <ProductGallery
                  images={product.images ?? []}
                  alt={product.name_ru}
                />
              </div>

              {/* grid-row: 1/-1 — область сайдбара во всю высоту сетки,
                  иначе sticky некуда прилипать. */}
              <aside className="order-3 lg:col-start-2 lg:self-start lg:[grid-row:1/-1] lg:sticky lg:top-24">
                <div className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
                  <div>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <p className="text-2xl font-bold text-primary">
                        {groups.length > 0
                          ? summary.label
                          : formatPrice(product.price)}
                      </p>
                      <StatusPill tone={availabilityTone(product.availability)}>
                        {availabilityLabel(product.availability)}
                      </StatusPill>
                    </div>

                    {groups.length > 0 && selected.length > 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        С учётом выбранной комплектации ({selected.length})
                      </p>
                    ) : null}
                  </div>

                  {/* Комплектация стоит рядом с ценой и кнопкой: отдельным
                      блоком под галереей она занимала полосу во всю ширину,
                      хотя влияет ровно на эти два числа. */}
                  {groups.length > 0 ? (
                    <div className="border-t border-border pt-5">
                      <ProductConfigurator
                        groups={groups}
                        basePrice={product.price}
                        selection={selection}
                        onSelectionChange={setSelection}
                        embedded
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
                    <div className="inline-flex items-center rounded-xl border border-border">
                      <button
                        type="button"
                        aria-label="Уменьшить количество"
                        disabled={qty <= 1}
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="grid h-11 w-11 place-items-center text-muted-foreground disabled:opacity-40"
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
                        className="grid h-11 w-11 place-items-center text-muted-foreground"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <Button
                      className="w-full flex-1 sm:w-auto"
                      disabled={addMutation.isPending}
                      onClick={addToCartClick}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {addMutation.isPending ? "Добавляем…" : "В корзину"}
                    </Button>

                    {missing.length > 0 ? (
                      <p className="w-full text-xs font-semibold text-destructive">
                        Сначала выберите:{" "}
                        {missing.map((g) => g.name_ru).join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </aside>

              {tabs.length > 0 ? (
                <div className="order-4 lg:col-start-1 lg:row-start-3">
                  <ProductTabs tabs={tabs} />
                </div>
              ) : null}
            </article>
          ) : null}
        </StateBlock>
      </div>
    </AppShell>
  );
}
