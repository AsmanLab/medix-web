import type { ReactNode } from "react";
import { isAppError } from "@/api/errors";
import { Button } from "@/components/ui/button";

type StateBlockProps = {
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingFallback?: ReactNode;
  emptyFallback?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  children?: ReactNode;
};

export function StateBlock({
  isLoading,
  isError,
  error,
  isEmpty,
  onRetry,
  loadingFallback,
  emptyFallback,
  emptyTitle = "Пока пусто",
  emptyDescription = "Данные появятся после публикации.",
  children,
}: StateBlockProps) {
  if (isLoading) {
    return (
      <>
        {loadingFallback ?? (
          <div
            className="rounded-3xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Загрузка…
          </div>
        )}
      </>
    );
  }

  if (isError) {
    const message = isAppError(error)
      ? error.message
      : "Не удалось загрузить данные";
    const requestId = isAppError(error) ? error.requestId : undefined;

    return (
      <div
        className="rounded-3xl border border-destructive/30 bg-card px-6 py-10 text-center"
        role="alert"
      >
        <p className="font-semibold text-foreground">Ошибка загрузки</p>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {requestId ? (
          <p className="mt-1 text-xs text-muted-foreground">ID: {requestId}</p>
        ) : null}
        {onRetry ? (
          <Button className="mt-4" onClick={onRetry}>
            Повторить
          </Button>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <>
        {emptyFallback ?? (
          <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <p className="font-semibold">{emptyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {emptyDescription}
            </p>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
