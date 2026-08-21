import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { isAppError } from "@/api/errors";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  BannerSkeleton,
  CardGridSkeleton,
  DetailSkeleton,
  ListSkeleton,
  type CardGridSkeletonVariant,
} from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/LocaleProvider";

export type LoadingVariant = "list" | "card-grid" | "detail" | "banner";

type StateBlockProps = {
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingFallback?: ReactNode;
  loadingVariant?: LoadingVariant;
  loadingCount?: number;
  cardGridVariant?: CardGridSkeletonVariant;
  /**
   * Оверрайд колонок скелетона. Каталог сужает сетку на `lg` (там сбоку
   * фильтр категорий), и без проброса скелетон рисовал четыре колонки, а
   * данные приходили в три — макет прыгал ровно в момент отрисовки.
   */
  cardGridClassName?: string;
  emptyFallback?: ReactNode;
  emptyIcon?: LucideIcon;
  emptyAction?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  children?: ReactNode;
};

function resolveLoadingFallback(
  variant: LoadingVariant | undefined,
  count: number,
  cardGridVariant: CardGridSkeletonVariant,
  cardGridClassName: string | undefined,
  t: ReturnType<typeof useT>,
): ReactNode {
  switch (variant) {
    case "list":
      return <ListSkeleton count={count} />;
    case "card-grid":
      return (
        <CardGridSkeleton
          count={count}
          variant={cardGridVariant}
          className={cardGridClassName}
        />
      );
    case "detail":
      return <DetailSkeleton />;
    case "banner":
      return <BannerSkeleton />;
    default:
      return (
        <div
          className="rounded-3xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {t("Загрузка…")}
        </div>
      );
  }
}

export function StateBlock({
  isLoading,
  isError,
  error,
  isEmpty,
  onRetry,
  loadingFallback,
  loadingVariant,
  loadingCount = 4,
  cardGridVariant = "category",
  cardGridClassName,
  emptyFallback,
  emptyIcon,
  emptyAction,
  emptyTitle,
  emptyDescription,
  children,
}: StateBlockProps) {
  const t = useT();
  if (isLoading) {
    return (
      <>
        {loadingFallback ??
          resolveLoadingFallback(
            loadingVariant,
            loadingCount,
            cardGridVariant,
            cardGridClassName,
            t,
          )}
      </>
    );
  }

  if (isError) {
    const message = isAppError(error)
      ? error.message
      : t("Не удалось загрузить данные");
    const requestId = isAppError(error) ? error.requestId : undefined;

    return (
      <div
        className="rounded-3xl border border-destructive/30 bg-card px-6 py-10 text-center"
        role="alert"
      >
        <p className="font-semibold text-foreground">{t("Ошибка загрузки")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {requestId ? (
          <p className="mt-1 text-xs text-muted-foreground">ID: {requestId}</p>
        ) : null}
        {onRetry ? (
          <Button className="mt-4" onClick={onRetry}>
            {t("Повторить")}
          </Button>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <>
        {emptyFallback ?? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle ?? t("Пока пусто")}
            description={emptyDescription ?? t("Данные появятся после публикации.")}
            action={emptyAction}
          />
        )}
      </>
    );
  }

  return <>{children}</>;
}
