import { Link, useNavigate } from "@tanstack/react-router";
import { HeartPulse, LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";
import { getAppQueryClient } from "@/app/providers";
import { logoutSession } from "@/session/store";

export function StaffShell({
  title,
  homeTo = "/",
  children,
}: {
  title: string;
  homeTo?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function onLogout() {
    setLoggingOut(true);
    try {
      await logoutSession(getAppQueryClient());
      await navigate({ to: "/login" });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-dvh bg-surface text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-5">
          <Link to={homeTo} className="inline-flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
              <HeartPulse className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-bold">Medix</span>
          </Link>
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-muted-foreground">{title}</p>
            <button
              type="button"
              disabled={loggingOut}
              onClick={() => void onLogout()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
              aria-label="Выйти"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">
                {loggingOut ? "Выход…" : "Выйти"}
              </span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
    </div>
  );
}
