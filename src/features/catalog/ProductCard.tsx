import { Link } from "@tanstack/react-router";
import { ImageOff } from "lucide-react";
import type { ProductListOut } from "@/api/catalog";
import { availabilityLabel } from "@/features/catalog/availability";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type ProductCardProps = {
  product: ProductListOut;
  /**
   * Первые карточки экрана грузятся немедленно: они попадают в LCP,
   * а `loading="lazy"` на видимой картинке только задерживает отрисовку.
   */
  priority?: boolean;
  className?: string;
};

/**
 * Карточка товара для витрины.
 *
 * Было три её копии — на главной, в каталоге и в разделе категории, — и они
 * разошлись: на главной над названием стоял производитель, в каталоге — SKU,
 * страна показывалась только в двух из трёх, а отсутствие фото на главной
 * давало пустой серый прямоугольник без объяснения.
 *
 * Карточка тянется на всю высоту ячейки (`h-full` + колонка), поэтому в сетке
 * с названиями разной длины низ у всех карточек выравнивается.
 */
export function ProductCard({
  product,
  priority,
  className,
}: ProductCardProps) {
  const origin = [product.manufacturer, product.country]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card",
        "shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary/40",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {product.primary_image_url ? (
          <img
            src={product.primary_image_url}
            alt=""
            width={800}
            height={600}
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-muted-foreground">
            <ImageOff className="h-7 w-7" aria-hidden />
            <span className="sr-only">Изображение не добавлено</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
          {product.sku}
        </p>
        <h3 className="mt-1 line-clamp-2 font-semibold leading-snug text-foreground group-hover:text-primary">
          {product.name_ru}
        </h3>
        {origin ? (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {origin}
          </p>
        ) : null}

        {/* mt-auto прижимает цену к низу: в сетке цены всех карточек ряда
            оказываются на одной линии независимо от длины названия. */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-4 text-sm">
          <span className="text-xs text-muted-foreground">
            {availabilityLabel(product.availability)}
          </span>
          <span className="text-right font-semibold text-primary">
            {formatMoney(product.price, "По запросу")}
          </span>
        </div>
      </div>
    </Link>
  );
}
