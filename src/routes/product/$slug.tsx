import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { catalogReturnHref } from "@/features/catalog/catalog-return";
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
import { formatMoney, formatPrice, parseMoney } from "@/lib/money";
import { usePageMeta } from "@/lib/page-meta";
import { cn } from "@/lib/utils";
import { useSession } from "@/session/store";
import { contentText } from "@/i18n/content";
import { useT } from "@/i18n/LocaleProvider";

export const Route = createFileRoute("/product/$slug")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const t = useT();
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  // Вычисляется один раз при заходе на страницу: сама запись читается
  // (и, если страница восстановления её использует, стирается) на стороне
  // каталога — здесь только берём тот же адрес для ссылки «Назад».
  const [backHref] = useState(() => catalogReturnHref());
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
    () => summarizeConfigPrice(product?.price ?? null, selected, t),
    [product?.price, selected, t],
  );

  const isOnSale = useMemo(() => {
    const price = parseMoney(product?.price);
    const oldPrice = parseMoney(product?.old_price);
    return Boolean(price && oldPrice && oldPrice.amount > price.amount);
  }, [product?.price, product?.old_price]);

  // Название на языке страницы. `name` появилось вместе с переводами;
  // на старом бэкенде его нет, и тогда берётся русское — иначе карточка
  // осталась бы без заголовка.
  const productName = product ? contentText(product.name, product.name_ru) : "";

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

    const description = contentText(product.description, product.description_ru);
    if (description) {
      list.push({
        key: "specs",
        label: t("Технические характеристики"),
        shortLabel: t("Характеристики"),
        content: <ProductDescription text={description} bare />,
      });
    }
    if (product.documents?.length) {
      list.push({
        key: "docs",
        label: t("Документация"),
        content: <ProductDocuments documents={product.documents} />,
      });
    }
    if (video) {
      list.push({
        key: "video",
        label: t("Видео"),
        content: <ProductVideo video={video} title={productName} />,
      });
    }
    return list;
  }, [product, video]);

  // В описание берём производителя, страну и артикул, а не description_ru:
  // он размечен и хранит характеристики списком — в сниппете это мусор.
  usePageMeta({
    title: productName || undefined,
    description: product
      ? [product.manufacturer, product.country, t("Артикул {sku}", { sku: product.sku })]
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
      toast.success(t("Добавлено в корзину"), {
        action: {
          label: t("Корзина"),
          onClick: () => {
            void navigate({ to: "/cart" });
          },
        },
      });
    },
    onError: (err) =>
      toast.error(
        isAppError(err) ? err.message : t("Не удалось добавить в корзину"),
      ),
  });

  async function addToCartClick() {
    if (!product) return;

    // Корзина хранится на сервере, поэтому анонимному пользователю её негде
    // держать — отправляем на вход и возвращаем обратно на карточку.
    if (session.status !== "authenticated") {
      toast.message(t("Войдите, чтобы добавить товар в корзину"));
      await navigate({
        to: "/login",
        search: { redirect: `/product/${slug}`, phone: undefined },
      });
      return;
    }

    if (missing.length > 0) {
      toast.error(
        t("Выберите обязательные опции: {names}", {
          names: missing.map((g) => g.name_ru).join(", "),
        }),
      );
      return;
    }

    addMutation.mutate();
  }

  return (
    <AppShell>
      {/*
       * Обычный <a>, не Link роутера: адрес — произвольный путь каталога
       * или раздела, известный только в рантайме (из sessionStorage), а не
       * один из типизированных маршрутов. Полная навигация здесь не в
       * тягость — то же сохранённое место каталог читает из sessionStorage,
       * а не из истории роутера, и переживает даже F5.
       *
       * На ноутбуке (lg+) кнопка уходит из потока в узкую липкую колонку
       * слева от фото — блок «фото + название + цена» поднимается выше,
       * не теряя строку под сплошную ссылку сверху. На телефоне это лишний
       * фиксированный элемент на небольшом экране, поэтому там остаётся
       * обычная ссылка в потоке над фото.
       */}
      <div className="lg:flex lg:items-start lg:gap-3">
        <a
          href={backHref}
          aria-label={t("К каталогу")}
          className="hidden lg:sticky lg:top-24 lg:flex lg:h-11 lg:w-11 lg:shrink-0 lg:items-center lg:justify-center lg:self-start lg:rounded-full lg:border lg:border-border lg:bg-card lg:text-primary lg:shadow-[var(--shadow-soft)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </a>
        <a
          href={backHref}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />{t("К каталогу")}
        </a>

        <div className="mt-6 min-w-0 flex-1 lg:mt-0">
        <StateBlock
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={() => void query.refetch()}
          loadingVariant="detail"
        >
          {product ? (
            /*
             * Две колонки на десктопе: слева фотография и вкладки, справа —
             * липкий блок покупки, который теперь начинается с названия
             * (SKU → название → цена → наличие → конфигуратор → «В корзину»).
             * Раньше название стояло отдельным блоком над галереей во всю
             * ширину и визуально «лежало на фото», а справа при этом
             * пустовало место.
             *
             * `order-*` действует только во флексе (мобильная раскладка),
             * `col-start`/`row-start` — только в гриде (десктоп). На телефоне
             * это даёт порядок фото → название и цена → вкладки, оставаясь
             * одним узлом DOM: дублировать блок покупки ради раскладки
             * значило бы завести две кнопки «В корзину».
             *
             * Страница уже общего контейнера витрины: на 1320px левая колонка
             * отдавала фотографии ~900px, кадр занимал почти весь первый
             * экран, а строка описания под ним получалась длиной, на которой
             * глаз теряет начало следующей.
             */
            <article className="flex flex-col gap-6 lg:mx-auto lg:max-w-[1060px] lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(320px,26vw,380px)] lg:[grid-template-rows:auto_1fr] lg:items-start lg:gap-8">
              <div className="order-1 overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)] lg:col-start-1 lg:row-start-1">
                <ProductGallery
                  images={product.images ?? []}
                  alt={productName}
                />
              </div>

              {/* grid-row: 1/-1 — область сайдбара во всю высоту сетки,
                  иначе sticky некуда прилипать. */}
              <aside className="order-2 lg:col-start-2 lg:self-start lg:[grid-row:1/-1] lg:sticky lg:top-24">
                <div className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
                  <header>
                    <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
                      {product.sku}
                    </p>
                    <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
                      {productName}
                    </h1>
                    {product.manufacturer || product.country ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {[product.manufacturer, product.country]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </header>

                  <div className="border-t border-border pt-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        {groups.length === 0 && isOnSale ? (
                          <p className="text-sm text-muted-foreground line-through">
                            {formatMoney(product.old_price)}
                          </p>
                        ) : null}
                        <p
                          className={cn(
                            "text-2xl font-bold",
                            groups.length === 0 && isOnSale
                              ? "text-destructive"
                              : "text-primary",
                          )}
                        >
                          {groups.length > 0
                            ? summary.label
                            : formatPrice(product.price, t)}
                        </p>
                      </div>
                      <StatusPill tone={availabilityTone(product.availability)}>
                        {availabilityLabel(product.availability, t)}
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
                        aria-label={t("Уменьшить количество")}
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
                        aria-label={t("Увеличить количество")}
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
                      {addMutation.isPending ? t("Добавляем…") : t("В корзину")}
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
                <div className="order-3 lg:col-start-1 lg:row-start-2">
                  <ProductTabs tabs={tabs} />
                </div>
              ) : null}
            </article>
          ) : null}
        </StateBlock>
        </div>
      </div>
    </AppShell>
  );
}
