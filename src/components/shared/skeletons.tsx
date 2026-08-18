import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ListSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <ul
      className={cn("space-y-3", className)}
      aria-busy
      aria-label="Загрузка списка"
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <Skeleton className="h-[88px] rounded-2xl" />
        </li>
      ))}
    </ul>
  );
}

export type CardGridSkeletonVariant = "category" | "product" | "catalog";

export function CardGridSkeleton({
  count = 4,
  variant = "category",
  className,
}: {
  count?: number;
  variant?: CardGridSkeletonVariant;
  className?: string;
}) {
  if (variant === "product") {
    return (
      <ul
        className={cn(
          "flex gap-4 overflow-hidden pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible",
          className,
        )}
        aria-busy
        aria-label="Загрузка товаров"
      >
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="w-[260px] shrink-0 lg:w-auto">
            <Skeleton className="h-[188px] rounded-2xl" />
          </li>
        ))}
      </ul>
    );
  }

  if (variant === "catalog") {
    return (
      // Сетка обязана совпадать с ProductGrid, иначе при появлении данных
      // макет перестраивается — это видно как рывок и штрафуется в CLS.
      <ul
        className={cn(
          "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4",
          className,
        )}
        aria-busy
        aria-label="Загрузка каталога"
      >
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <div className="overflow-hidden rounded-xl border border-border bg-card sm:rounded-2xl">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-2 p-3 sm:p-4">
                {/* Артикул, производитель и наличие карточка показывает
                    только с 640px — скелетон повторяет это, иначе на
                    телефоне он выше содержимого. */}
                <Skeleton className="hidden h-3 w-16 sm:block" />
                <Skeleton className="h-5 w-[80%]" />
                <Skeleton className="hidden h-3 w-[40%] sm:block" />
                <div className="flex justify-between pt-1">
                  <Skeleton className="hidden h-4 w-20 sm:block" />
                  <Skeleton className="ml-auto h-4 w-16" />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}
      aria-busy
      aria-label="Загрузка категорий"
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="min-h-[96px] rounded-2xl" />
      ))}
    </div>
  );
}

export function DetailSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("space-y-6", className)}
      aria-busy
      aria-label="Загрузка страницы"
    >
      <Skeleton className="h-4 w-28" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-5 w-40" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
    </div>
  );
}

export function BannerSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton
      className={cn(
        "min-h-[360px] w-full rounded-3xl sm:min-h-[420px]",
        className,
      )}
      aria-busy
      aria-label="Загрузка баннера"
    />
  );
}
