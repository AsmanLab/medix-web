import { Outlet, createRootRoute, Link } from "@tanstack/react-router";
import { MapPinOff } from "lucide-react";
import { Toaster } from "sonner";
import { AppProviders } from "@/app/providers";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PushForegroundBridge } from "@/features/notifications/PushForegroundBridge";
import { useT } from "@/i18n/LocaleProvider";

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <Outlet />
        {/* Уведомления при открытой вкладке: браузер их не показывает сам. */}
        <PushForegroundBridge />
        <Toaster richColors position="top-center" closeButton />
      </AppProviders>
    </ErrorBoundary>
  );
}

function NotFound() {
  const t = useT();
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <p className="text-center font-display text-6xl font-bold text-muted-foreground/40">
          404
        </p>
        <EmptyState
          icon={MapPinOff}
          title={t("Страница не найдена")}
          description={t("Проверьте адрес или вернитесь на главную.")}
          action={
            <Link
              to="/"
              className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              {t("На главную")}
            </Link>
          }
          className="mt-4 border-solid shadow-[var(--shadow-soft)]"
        />
      </div>
    </div>
  );
}
