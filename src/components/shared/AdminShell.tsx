import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Boxes,
  Building2,
  FileUp,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  ShoppingCart,
  UserCog,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { getAppQueryClient } from "@/app/providers";
import { logoutSession, useSession } from "@/session/store";
import { cn } from "@/lib/utils";

type AdminNavKey =
  | "dashboard"
  | "users"
  | "staff"
  | "catalog"
  | "commerce"
  | "orders"
  | "service_desk"
  | "cms"
  | "banners"
  | "reports"
  | "settings";

type AdminNavItem = {
  key: AdminNavKey;
  to: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
  allowedRoles: Array<"admin" | "manager" | "service_engineer">;
};

function Logo() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
      <HeartPulse className="h-4 w-4" />
    </span>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const role = user?.role;

  async function onLogout() {
    setLoggingOut(true);
    try {
      await logoutSession(getAppQueryClient());
      await navigate({ to: "/login" });
    } finally {
      setLoggingOut(false);
    }
  }

  const nav = useMemo((): AdminNavItem[] => {
    const common = ["admin", "manager", "service_engineer"] as const;
    const isRole = (r: unknown): r is "admin" | "manager" | "service_engineer" =>
      r === "admin" || r === "manager" || r === "service_engineer";

    const allowed = role && isRole(role) ? role : null;

    const items: AdminNavItem[] = [
      {
        key: "dashboard",
        to: "/admin",
        label: "Обзор",
        icon: ({ className }) => (
          <LayoutDashboard className={className} aria-hidden />
        ),
        allowedRoles: [...common],
      },
      {
        key: "users",
        to: "/admin/users",
        label: "Клиенты",
        icon: ({ className }) => <Users className={className} aria-hidden />,
        allowedRoles: ["admin", "manager"],
      },
      {
        key: "staff",
        to: "/admin/staff",
        label: "Сотрудники",
        icon: ({ className }) => <UserCog className={className} aria-hidden />,
        allowedRoles: ["admin"],
      },
      {
        key: "catalog",
        to: "/admin/catalog",
        label: "Каталог",
        icon: ({ className }) => <Boxes className={className} aria-hidden />,
        allowedRoles: ["admin"],
      },
      {
        key: "commerce",
        to: "/admin/commerce",
        label: "Коммерция",
        icon: ({ className }) => <Package className={className} aria-hidden />,
        allowedRoles: ["admin", "manager"],
      },
      {
        key: "orders",
        to: "/admin/orders",
        label: "Заказы",
        icon: ({ className }) => (
          <ShoppingCart className={className} aria-hidden />
        ),
        allowedRoles: ["admin", "manager"],
      },
      {
        key: "service_desk",
        to: "/admin/service-desk",
        label: "Сервисная служба",
        icon: ({ className }) => <Wrench className={className} aria-hidden />,
        allowedRoles: ["admin", "manager", "service_engineer"],
      },
      {
        key: "cms",
        to: "/admin/cms",
        label: "CMS",
        icon: ({ className }) => (
          <Megaphone className={className} aria-hidden />
        ),
        allowedRoles: ["admin"],
      },
      {
        key: "banners",
        to: "/admin/banners",
        label: "Баннеры",
        icon: ({ className }) => <Megaphone className={className} aria-hidden />,
        allowedRoles: ["admin"],
      },
      {
        key: "reports",
        to: "/admin/reports",
        label: "Отчёты",
        icon: ({ className }) => (
          <FileUp className={className} aria-hidden />
        ),
        // Менеджеру нужен свой отчёт за месяц (ТЗ п. 9.1); чужие строки
        // отсекает сервер.
        allowedRoles: ["admin", "manager"],
      },
      {
        key: "settings",
        to: "/admin/settings",
        label: "Настройки",
        icon: ({ className }) => <Building2 className={className} aria-hidden />,
        allowedRoles: ["admin"],
      },
    ];

    if (!allowed) return [];
    return items.filter((i) => i.allowedRoles.includes(allowed));
  }, [role]);

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[280px] border-r border-border/80 bg-card/95 shadow-[var(--shadow-soft)] backdrop-blur transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
          aria-label="Навигация админ-панели"
        >
          <div className="flex h-16 items-center justify-between gap-3 px-5">
            <Link
              to="/admin"
              className="inline-flex items-center gap-3"
              aria-label="На главную админ-панели"
              onClick={() => setOpen(false)}
            >
              <Logo />
              <span className="font-display text-sm font-bold">Medix</span>
            </Link>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Закрыть меню"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <nav className="flex h-[calc(100%-4rem)] flex-col px-3 pb-6 pt-2">
            <ul className="space-y-1">
              {nav.map((item) => {
                const active =
                  item.to === "/admin"
                    ? path === "/admin"
                    : path.startsWith(item.to);
                return (
                  <li key={item.key}>
                    <Link
                      to={item.to}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                        active
                          ? "bg-primary-soft text-primary"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                      )}
                      onClick={() => setOpen(false)}
                    >
                      {item.icon({
                        className: cn(
                          "h-4 w-4",
                          active ? "text-primary" : "text-muted-foreground",
                        ),
                      })}
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto border-t border-border pt-3">
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => void onLogout()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                {loggingOut ? "Выход…" : "Выйти"}
              </button>
            </div>
          </nav>
        </aside>

        {/* Content */}
        <div>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur lg:hidden">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card"
              onClick={() => setOpen(true)}
              aria-label="Открыть меню админ-панели"
            >
              <span className="text-lg" aria-hidden>
                ☰
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Admin
              </p>
              <h2 className="font-display text-sm font-bold">
                {role === "admin"
                  ? "Администратор"
                  : role === "manager"
                    ? "Менеджер"
                    : role === "service_engineer"
                      ? "Инженер"
                      : "—"}
              </h2>
            </div>
            <button
              type="button"
              disabled={loggingOut}
              onClick={() => void onLogout()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-muted-foreground"
              aria-label="Выйти"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">
                {loggingOut ? "Выход…" : "Выйти"}
              </span>
            </button>
          </header>

          {/* Mobile backdrop */}
          {open ? (
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Закрыть меню"
            />
          ) : null}

          <main className="mx-auto max-w-5xl px-5 py-8 lg:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

