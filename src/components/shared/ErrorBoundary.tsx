import { Link } from "@tanstack/react-router";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/LocaleProvider";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  private reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback error={this.state.error} onReset={this.reset} />
      );
    }

    return this.props.children;
  }
}

function ErrorFallback({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) {
  const t = useT();
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-5">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          {t("Ошибка")}
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold">
          {t("Что-то пошло не так")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Произошла непредвиденная ошибка. Попробуйте повторить или вернитесь на
          главную.
        </p>
        {import.meta.env.DEV && error ? (
          <p className="mt-3 break-all text-left text-xs text-muted-foreground">
            {error.message}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={onReset}>
            {t("Повторить")}
          </Button>
          <Link
            to="/"
            className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            {t("На главную")}
          </Link>
        </div>
      </div>
    </div>
  );
}
