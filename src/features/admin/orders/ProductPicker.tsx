import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchAdminProducts, type ProductListOut } from "@/api/catalog";
import { queryKeys } from "@/api/query-keys";
import { formatMoney } from "@/lib/money";

const DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 10;

type ProductPickerProps = {
  onAdd: (product: ProductListOut) => void;
};

/** Поиск товара для добавления позиции в заказ, с задержкой ввода. */
export function ProductPicker({ onAdd }: ProductPickerProps) {
  const [draftQ, setDraftQ] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQ(draftQ.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draftQ]);

  const productsQuery = useQuery({
    queryKey: queryKeys.catalog.adminProducts({ q, limit: SEARCH_LIMIT }),
    queryFn: ({ signal }) =>
      fetchAdminProducts({ q, limit: SEARCH_LIMIT }, signal),
    enabled: q.length > 0,
  });

  const items = q ? (productsQuery.data ?? []) : [];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          value={draftQ}
          onChange={(e) => setDraftQ(e.target.value)}
          placeholder="Название или SKU товара…"
          aria-label="Поиск товара"
          className="field-control pl-10"
        />
      </div>

      {q ? (
        productsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Ищем…</p>
        ) : productsQuery.isError ? (
          <p className="text-sm text-destructive">
            Не удалось загрузить товары
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ничего не найдено.</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-border p-2">
            {items.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onAdd(p)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-secondary/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {p.name}
                    </span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {p.sku}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatMoney(p.price, "цена по запросу")}
                    </span>
                    <Plus
                      className="h-4 w-4 text-primary"
                      aria-hidden
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
