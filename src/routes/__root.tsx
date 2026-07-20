import { Outlet, createRootRoute, Link } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AppProviders } from "@/app/providers";

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <AppProviders>
      <Outlet />
      <Toaster richColors position="top-center" closeButton />
    </AppProviders>
  );
}

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="max-w-md text-center">
        <h1 className="font-display text-6xl font-bold">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">Страница не найдена</p>
        <Link
          to="/"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
