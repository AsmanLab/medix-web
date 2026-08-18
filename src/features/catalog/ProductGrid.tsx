import type { ProductListOut } from "@/api/catalog";
import { ProductCard } from "@/features/catalog/ProductCard";
import { cn } from "@/lib/utils";

type ProductGridProps = {
  products: ProductListOut[];
  className?: string;
};

/**
 * Сетка товаров витрины — одна на каталог и на раздел категории.
 *
 * Раньше это были две копии в route-файлах, успевшие разойтись по вёрстке
 * и по формату цены.
 *
 * Колонки добавляются рано и держат карточку в пределах ~310px. Сетка
 * обрывалась на двух при контейнере 1320px, и карточка растягивалась
 * до ~630px: фотография аппарата занимала пол-экрана, а в поле зрения
 * помещалось четыре товара вместо шестнадцати — каталогом это
 * не просматривалось.
 *
 * Ширина карточки по брейкпоинтам (контейнер 1320px, gap 16px):
 *   <640      2 колонки  ~170px
 *   640–767   2 колонки  ~290px
 *   768–1023  3 колонки  ~235–330px
 *   ≥1024     4 колонки  ~232–306px
 *
 * На телефоне тоже две колонки: одна карточка во всю ширину экрана отдавала
 * фотографии пол-экрана, и в поле зрения помещалось полтора товара. Карточка
 * при этом ужимается — см. `density` в ProductCard.
 */
export function ProductGrid({ products, className }: ProductGridProps) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {products.map((product, index) => (
        <li key={product.id}>
          {/* Первый ряд грузится немедленно: он попадает в LCP. */}
          <ProductCard product={product} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}
