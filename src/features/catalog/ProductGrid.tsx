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
 * До четырёх колонок на широких экранах: контейнер витрины 1320px, а сетка
 * обрывалась на двух, из-за чего каталог на десктопе выглядел как столбец
 * огромных карточек с пустыми полями по краям.
 */
export function ProductGrid({ products, className }: ProductGridProps) {
  return (
    <ul
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
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
