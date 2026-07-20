import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  HeartPulse,
  LayoutGrid,
  LogIn,
  LogOut,
  Package,
  ShoppingCart,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { getAppQueryClient } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { useRfqCart } from "@/features/rfq/cart-store";
import { logoutSession, useSession } from "@/session/store";
import { cn } from "@/lib/utils";

const nav = [
  {
    to: "/catalog",
    label: "Каталог",
    match: (p: string) => p.startsWith("/catalog") || p.startsWith("/product"),
  },
  {
    to: "/cart",
    label: "Корзина",
    match: (p: string) => p.startsWith("/cart"),
  },
  { to: "/profile", label: "Профиль", match: (p: string) => p.startsWith("/profile") },
  {
    to: "/requests",
    label: "Заявки",
    match: (p: string) => p.startsWith("/requests") || p.startsWith("/orders"),
  },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const session = useSession();
  const navigate = useNavigate();
  const cart = useRfqCart();
  const cartCount = cart.items.reduce((s, i) => s + i.qty, 0);
  const authenticated = session.status === "authenticated";

  async function onLogout() {
    await logoutSession(getAppQueryClient());
    toast.success("Вы вышли из аккаунта");
    await navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-surface text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5">
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Medix">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white">
              <HeartPulse className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight">
              Medix
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition",
                  item.match(path)
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {item.to === "/cart" && cartCount > 0 ? (
                  <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/cart"
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-border sm:hidden"
              aria-label="Корзина"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 ? (
                <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              ) : null}
            </Link>
            {authenticated ? (
              <Button variant="outline" size="sm" onClick={() => void onLogout()}>
                <LogOut className="h-4 w-4" />
                Выйти
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void navigate({ to: "/login" })}
              >
                <LogIn className="h-4 w-4" />
                Войти
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm">
          <p className="font-display font-bold">Medix</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground">
            <Link to="/about" className="hover:text-foreground">
              О компании
            </Link>
            <Link to="/promotions" className="hover:text-foreground">
              Акции
            </Link>
            <Link to="/contacts" className="hover:text-foreground">
              Контакты
            </Link>
            <Link to="/service" className="hover:text-foreground">
              Сервис
            </Link>
            <Link
              to="/pages/$slug"
              params={{ slug: "privacy" }}
              className="hover:text-foreground"
            >
              Политика
            </Link>
          </nav>
        </div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card sm:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 py-2">
          <MobileTab
            to="/catalog"
            label="Каталог"
            icon={LayoutGrid}
            active={
              path.startsWith("/catalog") ||
              path.startsWith("/product") ||
              path === "/"
            }
          />
          <MobileTab
            to="/cart"
            label="Корзина"
            icon={ShoppingCart}
            active={path.startsWith("/cart")}
            badge={cartCount}
          />
          <MobileTab
            to="/requests"
            label="Заявки"
            icon={Package}
            active={path.startsWith("/requests") || path.startsWith("/orders")}
          />
          <MobileTab
            to={authenticated ? "/profile" : "/login"}
            label={authenticated ? "Профиль" : "Вход"}
            icon={authenticated ? User : LogIn}
            active={
              path.startsWith("/profile") ||
              path.startsWith("/login") ||
              path.startsWith("/register")
            }
          />
        </div>
      </nav>
      <div className="h-16 sm:hidden" />
    </div>
  );
}

function MobileTab({
  to,
  label,
  icon: Icon,
  active,
  badge,
}: {
  to: string;
  label: string;
  icon: typeof LayoutGrid;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "relative flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
      {badge && badge > 0 ? (
        <span className="absolute top-1 right-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
