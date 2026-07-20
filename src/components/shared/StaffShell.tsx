import { Link } from "@tanstack/react-router";
import { HeartPulse } from "lucide-react";
import type { ReactNode } from "react";

export function StaffShell({
  title,
  homeTo = "/",
  children,
}: {
  title: string;
  homeTo?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Link to={homeTo} className="inline-flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
              <HeartPulse className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-bold">Medix</span>
          </Link>
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
    </div>
  );
}
