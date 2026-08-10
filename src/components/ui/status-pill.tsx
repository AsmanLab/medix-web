import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Статусная «таблетка».
 *
 * Тон вычисляют доменные модули (`orderStatusTone`, `rfqStatusTone`,
 * `serviceStatusTone`), а в цвет его превращали 14 копий одного и того же
 * `cn(tone === "success" && "bg-emerald-...")`. Копии успели разойтись:
 * у клиента статус рисовался как `bg-emerald-100 text-emerald-800`,
 * в админке — как `bg-emerald-500/15 text-emerald-700`, то есть один
 * и тот же заказ выглядел по-разному в зависимости от того, кто смотрит.
 *
 * Здесь единственное место, где тон становится цветом, и цвета взяты
 * из токенов, а не из палитры Tailwind.
 */
const statusPillVariants = cva(
  "inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        primary: "bg-primary-soft text-primary",
        success: "bg-success-soft text-success-strong",
        warning: "bg-warning-soft text-warning-strong",
        danger: "bg-danger-soft text-danger-strong",
        muted: "bg-muted text-muted-foreground",
      },
      size: {
        default: "px-2.5 py-1 text-[11px]",
        lg: "px-3 py-1.5 text-xs",
        // Плотные списки админки: строки таблиц идут вплотную, и таблетка
        // размера витрины ломала бы ритм. Форма отличается намеренно —
        // это другой контекст, а не другой дизайн.
        compact: "rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase",
      },
    },
    defaultVariants: { tone: "muted", size: "default" },
  },
);

export type StatusTone = NonNullable<
  VariantProps<typeof statusPillVariants>["tone"]
>;

export type StatusPillProps = VariantProps<typeof statusPillVariants> & {
  children: ReactNode;
  className?: string;
};

export function StatusPill({
  tone,
  size,
  className,
  children,
}: StatusPillProps) {
  return (
    <span className={cn(statusPillVariants({ tone, size }), className)}>
      {children}
    </span>
  );
}

export { statusPillVariants };
