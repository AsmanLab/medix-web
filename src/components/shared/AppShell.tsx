import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { HeartPulse, LayoutGrid, LogIn, LogOut, Package, User } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { getAppQueryClient } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { logoutSession, useSession } from "@/session/store";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/catalog", label: "Каталог", match: (p: string) => p.startsWith("/catalog") },
  { to: "/profile", label: "Профиль", match: (p: string) => p.startsWith("/profile") },
  { to: "/orders", label: "Заказы", match: (p: string) => p.startsWith("/orders") },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const session = useSession();
  const navigate = useNavigate();
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
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
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

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card sm:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 py-2">
          <MobileTab to="/catalog" label="Каталог" icon={LayoutGrid} active={path.startsWith("/catalog") || path === "/"} />
          <MobileTab to="/orders" label="Заказы" icon={Package} active={path.startsWith("/orders")} />
          <MobileTab to="/profile" label="Профиль" icon={User} active={path.startsWith("/profile")} />
          <MobileTab
            to={authenticated ? "/profile" : "/login"}
            label={authenticated ? "Кабинет" : "Вход"}
            icon={authenticated ? User : LogIn}
            active={path.startsWith("/login") || path.startsWith("/register")}
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
}: {
  to: string;
  label: string;
  icon: typeof LayoutGrid;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
