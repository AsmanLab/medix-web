import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Кнопка и её классы.
 *
 * `buttonVariants` экспортируется, чтобы ссылки роутера выглядели как кнопки
 * без обёрток: `<Link className={buttonVariants({ variant: "primary" })}>`.
 * Без этого по коду расползлись 26 рукописных `inline-flex h-11 items-center
 * rounded-xl bg-primary px-5 …` — с разной высотой, радиусом и, главное,
 * без общего focus-ring.
 *
 * Варианты покрывают то, что реально собиралось руками: `subtle` — мягкая
 * подложка primary (кнопка кабинета, вкладки админки), `ghost` — действие
 * без рамки в плотных списках, `destructive` — удаление.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold",
    "transition disabled:pointer-events-none disabled:opacity-60",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    // Отклик на нажатие. На тач-экране `hover:` не срабатывает вовсе, поэтому
    // до этой строки нажатие на кнопку не давало никакого сигнала, пока
    // не перерисуется содержимое. Сдвиг общий для всех вариантов, а заливка
    // своя у каждого — ниже.
    "active:translate-y-px",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 shadow-sm",
        outline:
          "border border-border bg-card text-foreground hover:bg-secondary active:bg-secondary",
        subtle:
          "bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-primary-foreground",
        ghost: "text-foreground hover:bg-secondary active:bg-secondary",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 shadow-sm",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6",
        // Квадратная кнопка-иконка. 44px — минимальный тач-таргет из
        // design-system/MASTER.md; в списках это правило нарушалось чаще всего.
        icon: "h-11 w-11 shrink-0 p-0",
        "icon-sm": "h-9 w-9 shrink-0 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
