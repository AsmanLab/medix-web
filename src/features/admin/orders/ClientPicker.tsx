import { useQuery } from "@tanstack/react-query";
import { Search, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { listManagerCustomers, type ManagerCustomer } from "@/api/customers";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { clientTypeLabel } from "@/features/profile/labels";
import { cn } from "@/lib/utils";

type ClientPickerProps = {
  selectedUserId: string | null;
  onSelect: (customer: ManagerCustomer) => void;
  onRequestNewClient: () => void;
};

/**
 * Поиск существующего клиента для ручного заказа. Отдельной ручки поиска
 * нет — как и в `admin/users/index.tsx`, список клиентов забирается целиком
 * и фильтруется на клиенте по ФИО/организации/телефону.
 */
export function ClientPicker({
  selectedUserId,
  onSelect,
  onRequestNewClient,
}: ClientPickerProps) {
  const [query, setQuery] = useState("");

  const customersQuery = useQuery({
    queryKey: queryKeys.adminCustomers.list(),
    queryFn: ({ signal }) => listManagerCustomers(null, signal),
  });

  const needle = query.trim().toLocaleLowerCase("ru");
  const items = useMemo(() => {
    const raw = customersQuery.data ?? [];
    if (!needle) return raw;
    return raw.filter((c) => {
      const hay = [c.full_name, c.organization, c.phone]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ru");
      return hay.includes(needle);
    });
  }, [customersQuery.data, needle]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Имя, организация, телефон…"
          aria-label="Поиск клиента"
          className="field-control pl-10"
        />
      </div>

      <StateBlock
        isLoading={customersQuery.isLoading}
        isError={customersQuery.isError}
        error={customersQuery.error}
        onRetry={() => void customersQuery.refetch()}
        loadingVariant="list"
        loadingCount={3}
      >
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {needle
                ? "Клиент не найден."
                : "Начните вводить имя, организацию или телефон."}
            </p>
            <button
              type="button"
              onClick={onRequestNewClient}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              Создать нового клиента
            </button>
          </div>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-border p-2">
            {items.map((c) => {
              const active = c.user_id === selectedUserId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c)}
                    className={cn(
                      "flex w-full flex-wrap items-baseline justify-between gap-2 rounded-xl px-3 py-2 text-left transition",
                      active
                        ? "bg-primary-soft text-primary"
                        : "hover:bg-secondary/60",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {c.full_name || "Без имени"}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[c.organization, clientTypeLabel(c.client_type)]
                          .filter(Boolean)
                          .join(" · ") || "Организация не указана"}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {c.phone || "—"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </StateBlock>

      {items.length > 0 ? (
        <button
          type="button"
          onClick={onRequestNewClient}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
        >
          <UserPlus className="h-3.5 w-3.5" aria-hidden />
          Клиента нет в списке — создать нового
        </button>
      ) : null}
    </div>
  );
}
