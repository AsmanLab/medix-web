import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  listManagerCustomers,
  type CustomerStatusFilter,
} from "@/api/customers";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import {
  clientTypeLabel,
  verificationLabel,
} from "@/features/profile/labels";
import { requireStaffPanel } from "@/session/guards";
import { cn } from "@/lib/utils";

type UsersSearch = {
  status?: CustomerStatusFilter;
  q?: string;
};

const STATUS_TABS: { value: CustomerStatusFilter | "all"; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "pending_verification", label: "На проверке" },
  { value: "unverified", label: "Не подтверждён" },
  { value: "verified", label: "Проверен" },
  { value: "rejected", label: "Отклонён" },
];

export const Route = createFileRoute("/admin/users/")({
  validateSearch: (search: Record<string, unknown>): UsersSearch => ({
    status:
      search.status === "unverified" ||
      search.status === "pending_verification" ||
      search.status === "verified" ||
      search.status === "rejected"
        ? search.status
        : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  beforeLoad: () => requireStaffPanel({ roles: ["admin", "manager"] }),
  component: UsersPage,
});

function statusTone(status: string) {
  if (status === "verified") return "success";
  if (status === "rejected") return "danger";
  if (status === "pending_verification" || status === "pending") return "warning";
  return "muted";
}

function UsersPage() {
  const { status, q: qFromUrl } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [draftQ, setDraftQ] = useState(qFromUrl ?? "");

  const listQuery = useQuery({
    queryKey: queryKeys.adminCustomers.list(status),
    queryFn: ({ signal }) => listManagerCustomers(status, signal),
  });

  const items = useMemo(() => {
    const raw = listQuery.data ?? [];
    const needle = (qFromUrl ?? "").trim().toLocaleLowerCase("ru");
    if (!needle) return raw;
    return raw.filter((c) => {
      const hay = [c.full_name, c.organization, c.city, c.phone, c.address]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ru");
      return hay.includes(needle);
    });
  }, [listQuery.data, qFromUrl]);

  function setStatus(next: CustomerStatusFilter | "all") {
    void navigate({
      search: (prev) => ({
        ...prev,
        status: next === "all" ? undefined : next,
      }),
      replace: true,
    });
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void navigate({
      search: (prev) => ({
        ...prev,
        q: draftQ.trim() || undefined,
      }),
      replace: true,
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
            <Users className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Клиенты</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Верификация организаций и профилей
            </p>
          </div>
        </div>
      </header>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Фильтр по статусу"
      >
        {STATUS_TABS.map((tab) => {
          const active =
            tab.value === "all" ? !status : status === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatus(tab.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={onSearchSubmit} className="flex gap-2" role="search">
        <label htmlFor="admin-customers-search" className="sr-only">
          Поиск клиентов
        </label>
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="admin-customers-search"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Имя, организация, город…"
            className="field-control pl-10"
          />
        </div>
        <button
          type="submit"
          className="h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Найти
        </button>
      </form>

      <StateBlock
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        error={listQuery.error}
        isEmpty={listQuery.isSuccess && items.length === 0}
        onRetry={() => void listQuery.refetch()}
        loadingVariant="list"
        emptyIcon={Users}
        emptyTitle="Клиенты не найдены"
        emptyDescription="Измените фильтр или дождитесь новых регистраций."
      >
        <ul className="space-y-3">
          {items.map((customer) => {
            const tone = statusTone(customer.verification_status);
            return (
              <li key={customer.id}>
                <Link
                  to="/admin/users/$customerId"
                  params={{ customerId: customer.id }}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{customer.full_name || "Без имени"}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {[
                        customer.organization,
                        clientTypeLabel(customer.client_type),
                        customer.city,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Организация не указана"}
                    </p>
                    {customer.phone ? (
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {customer.phone}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      tone === "success" && "bg-emerald-100 text-emerald-800",
                      tone === "danger" && "bg-red-100 text-red-800",
                      tone === "warning" && "bg-amber-100 text-amber-900",
                      tone === "muted" && "bg-muted text-muted-foreground",
                    )}
                  >
                    {verificationLabel(customer.verification_status)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </StateBlock>
    </div>
  );
}
