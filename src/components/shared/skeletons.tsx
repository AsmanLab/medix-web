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
    <ul className={cn("space-y-3", className)} aria-busy aria-label="Загрузка списка">
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
          "flex gap-3 overflow-hidden pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible",
          className,
        )}
        aria-busy
        aria-label="Загрузка товаров"
      >
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="w-[240px] shrink-0 lg:w-auto">
            <Skeleton className="h-[188px] rounded-2xl" />
          </li>
        ))}
      </ul>
    );
  }

  if (variant === "catalog") {
    return (
      <div
        className={cn("grid gap-4 sm:grid-cols-2", className)}
        aria-busy
        aria-label="Загрузка каталога"
      >
        {Array.from({ length: count }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
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
      className={cn("min-h-[360px] w-full rounded-3xl sm:min-h-[420px]", className)}
      aria-busy
      aria-label="Загрузка баннера"
    />
  );
}
