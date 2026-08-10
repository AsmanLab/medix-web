import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { OptionGroupOut } from "@/api/generated/schemas";
import {
  activeOptions,
  isSingleChoiceGroup,
  missingRequiredGroups,
  selectedOptionsFromState,
  summarizeConfigPrice,
  type ConfigSelection,
} from "@/features/catalog/configurator-logic";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type ProductConfiguratorProps = {
  groups: OptionGroupOut[];
  basePrice: string | null;
  selection: ConfigSelection;
  onSelectionChange: (next: ConfigSelection) => void;
};

export function ProductConfigurator({
  groups,
  basePrice,
  selection,
  onSelectionChange,
}: ProductConfiguratorProps) {
  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.sort - b.sort),
    [groups],
  );
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(sortedGroups.map((g) => g.id)),
  );

  const selected = useMemo(
    () => selectedOptionsFromState(sortedGroups, selection),
    [selection, sortedGroups],
  );
  const summary = useMemo(
    () => summarizeConfigPrice(basePrice, selected),
    [basePrice, selected],
  );
  const missing = useMemo(
    () => missingRequiredGroups(sortedGroups, selection),
    [selection, sortedGroups],
  );

  function toggleOpen(groupId: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function selectSingle(groupId: string, optionId: string) {
    onSelectionChange({
      ...selection,
      singles: { ...selection.singles, [groupId]: optionId },
    });
  }

  function toggleMulti(optionId: string) {
    const has = selection.multi.includes(optionId);
    onSelectionChange({
      ...selection,
      multi: has
        ? selection.multi.filter((id) => id !== optionId)
        : [...selection.multi, optionId],
    });
  }

  if (sortedGroups.length === 0) return null;

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-card p-5">
      <div>
        <h2 className="font-semibold">Конфигурация</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Выберите комплектацию и дополнительные опции
        </p>
      </div>

      <ul className="space-y-3">
        {sortedGroups.map((group) => {
          const opts = activeOptions(group);
          if (opts.length === 0) return null;
          const open = openIds.has(group.id);
          const single = isSingleChoiceGroup(group);
          const required = missing.some((g) => g.id === group.id);

          const panelId = `config-group-${group.id}`;

          return (
            <li
              key={group.id}
              className="overflow-hidden rounded-2xl border border-border"
            >
              <button
                type="button"
                id={`${panelId}-trigger`}
                onClick={() => toggleOpen(group.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                aria-expanded={open}
                aria-controls={panelId}
              >
                <span>
                  <span className="block text-sm font-semibold">
                    {group.name_ru}
                    {single ? (
                      <span className="ml-2 text-[11px] font-medium text-primary">
                        выберите один
                      </span>
                    ) : null}
                  </span>
                  {required ? (
                    <span className="text-[11px] font-semibold text-destructive">
                      Обязательный выбор
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition",
                    open && "rotate-180",
                  )}
                />
              </button>

              {open ? (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={`${panelId}-trigger`}
                  className="space-y-2 border-t border-border px-4 py-3"
                >
                  {opts.map((opt) => {
                    const priceLabel = formatMoney(opt.price, "По запросу");
                    if (single) {
                      const checked = selection.singles[group.id] === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition",
                            checked
                              ? "border-primary bg-primary-soft/50"
                              : "border-border hover:border-primary/40",
                          )}
                        >
                          <input
                            type="radio"
                            name={`group-${group.id}`}
                            className="mt-1"
                            checked={checked}
                            onChange={() => selectSingle(group.id, opt.id)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">
                              {opt.name_ru}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {priceLabel}
                              {opt.is_required ? " · обяз." : ""}
                            </span>
                          </span>
                        </label>
                      );
                    }

                    const checked = selection.multi.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition",
                          checked
                            ? "border-primary bg-primary-soft/50"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={() => toggleMulti(opt.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {opt.name_ru}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {priceLabel}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="rounded-2xl bg-secondary/50 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Итого конфигурации
        </p>
        <p className="mt-1 text-lg font-bold text-primary">{summary.label}</p>
        {selected.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {selected.map((o) => (
              <li key={o.id}>
                + {o.name_ru}
                {o.price ? ` · ${formatMoney(o.price)}` : " · по запросу"}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
