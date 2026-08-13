import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  MapPinned,
  PackageCheck,
  Wrench,
} from "lucide-react";
import { useMemo } from "react";
import { fetchCategories, fetchProducts } from "@/api/catalog";
import { fetchBanners, type BannerOut } from "@/api/cms";
import { fetchMediaDownloadUrl } from "@/api/media";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { BannerSkeleton } from "@/components/shared/skeletons";
import { ProductCard } from "@/features/catalog/ProductCard";
import { buildCategoryTree } from "@/features/catalog/map-category";
import { BannerSlider } from "@/features/home/BannerSlider";

const FALLBACK_BANNER: BannerOut = {
  id: "fallback",
  image_key: "",
  title: "Медицинское оборудование для клиник Кыргызстана",
  subtitle: "Каталог, запросы цены (RFQ), заказы и сервис — в одном кабинете.",
  cta_text: "Смотреть каталог",
  link_url: "/catalog",
  deep_link: "",
};

const trust = [
  {
    icon: BadgeCheck,
    title: "Официальные поставки",
    text: "Сертификаты и регистрационные документы",
  },
  {
    icon: PackageCheck,
    title: "Склад в Бишкеке",
    text: "Популярные позиции уже в наличии",
  },
  {
    icon: Wrench,
    title: "Собственный сервис",
    text: "Монтаж, обучение и обслуживание",
  },
  {
    icon: MapPinned,
    title: "Доставка по КР",
    text: "До вашей клиники или лаборатории",
  },
] as const;

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const bannersQuery = useQuery({
    queryKey: queryKeys.cms.banners(),
    queryFn: ({ signal }) => fetchBanners(signal),
  });

  const banners = useMemo(() => {
    if (bannersQuery.isLoading) return [];
    const list = bannersQuery.data ?? [];
    return list.length > 0 ? list : [FALLBACK_BANNER];
  }, [bannersQuery.data, bannersQuery.isLoading]);

  const imageKeys = useMemo(
    () => banners.map((b) => b.image_key).filter(Boolean),
    [banners],
  );

  const imagesQuery = useQuery({
    queryKey: queryKeys.cms.bannerImages(imageKeys),
    queryFn: async ({ signal }) => {
      const entries = await Promise.all(
        banners.map(async (banner) => {
          const url = await fetchMediaDownloadUrl(banner.image_key, signal);
          return [banner.id, url] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, string | null>;
    },
    enabled: !bannersQuery.isLoading && imageKeys.length > 0,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: ({ signal }) => fetchCategories(signal),
  });

  const rootCategories = useMemo(
    () => buildCategoryTree(categoriesQuery.data ?? []).slice(0, 8),
    [categoriesQuery.data],
  );

  const productsQuery = useQuery({
    queryKey: queryKeys.catalog.products({ home: true, limit: 8 }),
    queryFn: ({ signal }) => fetchProducts({ limit: 8 }, signal),
  });

  const products = (productsQuery.data ?? []).filter((p) => p.is_published);

  return (
    <AppShell>
      <div className="space-y-[var(--spacing-section-lg)]">
        {bannersQuery.isLoading ? (
          <BannerSkeleton />
        ) : (
          <BannerSlider banners={banners} imageById={imagesQuery.data ?? {}} />
        )}

        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                Каталог
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">
                Направления
              </h2>
            </div>
            <Link
              to="/catalog"
              search={{ q: undefined }}
              className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"
            >
              Все категории <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <StateBlock
            isLoading={categoriesQuery.isLoading}
            isError={categoriesQuery.isError}
            error={categoriesQuery.error}
            isEmpty={categoriesQuery.isSuccess && rootCategories.length === 0}
            onRetry={() => void categoriesQuery.refetch()}
            loadingVariant="card-grid"
            loadingCount={8}
            emptyTitle="Категории пока не опубликованы"
            emptyDescription="Разделы появятся после публикации в админке."
          >
            <ul className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {rootCategories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to="/catalog/$categoryId"
                    params={{ categoryId: cat.slug || cat.id }}
                    search={{ subcategory: undefined, q: undefined }}
                    className="flex min-h-[96px] flex-col justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-sm font-bold text-primary">
                      {cat.name.slice(0, 1)}
                    </span>
                    <span className="text-sm font-semibold leading-snug">
                      {cat.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </StateBlock>
        </section>

        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                Подборка
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">
                Товары в каталоге
              </h2>
            </div>
            <Link
              to="/catalog"
              search={{ q: undefined }}
              className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"
            >
              В каталог <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <StateBlock
            isLoading={productsQuery.isLoading}
            isError={productsQuery.isError}
            error={productsQuery.error}
            isEmpty={productsQuery.isSuccess && products.length === 0}
            onRetry={() => void productsQuery.refetch()}
            loadingVariant="card-grid"
            cardGridVariant="product"
            loadingCount={4}
            emptyTitle="Товары пока не опубликованы"
            emptyDescription="Позиции появятся после публикации каталога."
          >
            {/* На узких экранах подборка листается вбок, на широких
                становится сеткой — но карточка внутри та же, что в каталоге. */}
            <ul
              aria-label="Товары в каталоге"
              className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible"
            >
              {products.map((p, index) => (
                <li
                  key={p.id}
                  className="w-[260px] shrink-0 snap-start lg:w-auto"
                >
                  <ProductCard product={p} priority={index < 4} />
                </li>
              ))}
            </ul>
          </StateBlock>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Почему Medix
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((item) => (
              <li key={item.title} className="py-1">
                <item.icon className="h-6 w-6 text-primary" />
                <p className="mt-3 text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {item.text}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl bg-gradient-to-br from-primary/15 via-surface to-mint/25 px-6 py-10 sm:px-10">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Нужен сервис или консультация?
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Поможем с подбором оборудования, запуском и обслуживанием — оставьте
            сервисную заявку или посмотрите каталог.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/service"
              className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Заявка на сервис
            </Link>
            <Link
              to="/contacts"
              className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-5 text-sm font-semibold"
            >
              Контакты
            </Link>
            <Link
              to="/catalog"
              search={{ q: undefined }}
              className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-5 text-sm font-semibold"
            >
              Открыть каталог
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
