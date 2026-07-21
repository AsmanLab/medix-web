import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  Wrench,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

function AdminHome() {
  // NOTE: admin back-end stats are not wired into the client yet.
  // We keep the UI ready (skeletons + placeholders) until endpoints are added.
  const statsQuery = useQuery({
    queryKey: ["admin", "dashboard", "stats"],
    queryFn: async () => ({
      pendingRfqs: 0,
      pendingVerifications: 0,
      newServiceRequests: 0,
    }),
    staleTime: 60_000,
  });

  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Админ панель
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Сводка по текущим задачам (пока демо).
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          <LayoutDashboard className="h-4 w-4" aria-hidden />
          {statsQuery.isLoading ? "Загрузка…" : "Актуально сейчас"}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
              <Clock3 className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Pending RFQ
            </p>
          </div>
          <div className="mt-3 flex items-end justify-between">
            {statsQuery.isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p className="font-display text-3xl font-bold">
                {stats?.pendingRfqs ?? 0}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
              <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Pending verifications
            </p>
          </div>
          <div className="mt-3 flex items-end justify-between">
            {statsQuery.isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p className="font-display text-3xl font-bold">
                {stats?.pendingVerifications ?? 0}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
              <Wrench className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              New service requests
            </p>
          </div>
          <div className="mt-3 flex items-end justify-between">
            {statsQuery.isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p className="font-display text-3xl font-bold">
                {stats?.newServiceRequests ?? 0}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
