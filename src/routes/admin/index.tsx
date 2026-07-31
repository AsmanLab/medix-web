import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  Package,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";
import { listManagerCustomers } from "@/api/customers";
import { listManagerOrders } from "@/api/manager-orders";
import { listManagerRfqs } from "@/api/manager-rfq";
import { queryKeys } from "@/api/query-keys";
import { listManagerServiceRequests } from "@/api/service-requests";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

/**
 * Обзор админки (ТЗ п. 10.1).
 *
 * Считается из тех же списков, что открываются по клику на плитке: отдельного
 * агрегирующего эндпоинта нет, а расхождение между обзором и разделом
 * выглядело бы как потеря заявок. Раньше все три плитки показывали ноль —
 * это была разметка без данных.
 */
function AdminHome() {
  const [rfqs, verifications, serviceRequests, orders] = useQueries({
    queries: [
      {
        queryKey: queryKeys.managerRfq.list(),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          listManagerRfqs(signal),
        staleTime: 60_000,
      },
      {
        queryKey: queryKeys.adminCustomers.list("pending_verification"),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          listManagerCustomers("pending_verification", signal),
        staleTime: 60_000,
      },
      {
        queryKey: queryKeys.service.managerList(),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          listManagerServiceRequests(signal),
        staleTime: 60_000,
      },
      {
        queryKey: queryKeys.managerOrders.list({ status: "new" }),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          listManagerOrders({ status: "new" }, signal),
        staleTime: 60_000,
      },
    ],
  });

  const loading =
    rfqs.isLoading ||
    verifications.isLoading ||
    serviceRequests.isLoading ||
    orders.isLoading;

  // Запрос ждёт менеджера, пока его никто не взял: in_review уже в работе.
  const pendingRfqs = (rfqs.data ?? []).filter(
    (r) => r.status === "submitted",
  ).length;
  const newServiceRequests = (serviceRequests.data ?? []).filter(
    (r) => r.status === "new",
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Админ панель
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold">Обзор</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Что ждёт обработки прямо сейчас
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          <LayoutDashboard className="h-4 w-4" aria-hidden />
          {loading ? "Загрузка…" : "Актуально сейчас"}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          to="/admin/commerce"
          label="Запросы без менеджера"
          value={pendingRfqs}
          isLoading={rfqs.isLoading}
          isError={rfqs.isError}
          icon={<Clock3 className="h-5 w-5 text-primary" aria-hidden />}
        />
        <StatTile
          to="/admin/users"
          label="Ждут верификации"
          value={verifications.data?.length ?? 0}
          isLoading={verifications.isLoading}
          isError={verifications.isError}
          icon={<CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />}
        />
        <StatTile
          to="/admin/service-desk"
          label="Новые заявки на сервис"
          value={newServiceRequests}
          isLoading={serviceRequests.isLoading}
          isError={serviceRequests.isError}
          icon={<Wrench className="h-5 w-5 text-primary" aria-hidden />}
        />
        <StatTile
          to="/admin/orders"
          label="Новые заказы"
          value={orders.data?.length ?? 0}
          isLoading={orders.isLoading}
          isError={orders.isError}
          icon={<Package className="h-5 w-5 text-primary" aria-hidden />}
        />
      </div>
    </div>
  );
}

type StatTileProps = {
  to: string;
  label: string;
  value: number;
  isLoading: boolean;
  isError: boolean;
  icon: ReactNode;
};

function StatTile({
  to,
  label,
  value,
  isLoading,
  isError,
  icon,
}: StatTileProps) {
  return (
    <Link
      to={to}
      className="block rounded-3xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
          {icon}
        </div>
        <p className="text-right text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="mt-3">
        {isLoading ? (
          <Skeleton className="h-7 w-20" />
        ) : isError ? (
          // Ноль вместо ошибки читался бы как «всё разобрано».
          <p className="text-sm font-semibold text-destructive">нет данных</p>
        ) : (
          <p className="font-display text-3xl font-bold">{value}</p>
        )}
      </div>
    </Link>
  );
}
