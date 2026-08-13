import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Аккордеон поверх Radix.
 *
 * Взят готовый примитив, а не написан свой: у аккордеона неочевидная
 * клавиатурная часть — стрелки между заголовками, Home/End, правильные
 * `aria-expanded` и `aria-controls`, — и написанная руками версия обычно
 * оказывается недоступной с клавиатуры. Radix это уже делает.
 *
 * Иконка — lucide, а не `@radix-ui/react-icons`: вторая библиотека икон
 * ради одного шеврона означала бы два набора с разной толщиной линий
 * в одном интерфейсе.
 *
 * Анимация раскрытия живёт в styles.css (`accordion-down`/`accordion-up`)
 * и опирается на переменную `--radix-accordion-content-height`, которую
 * примитив измеряет сам. Глобальный блок `prefers-reduced-motion` гасит
 * её вместе с остальными.
 */

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn(className)} {...props} />;
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "flex min-h-11 flex-1 touch-manipulation items-center justify-between gap-2 rounded-lg px-3 py-2",
          "text-left text-sm font-semibold transition",
          "hover:bg-secondary/70 active:bg-secondary",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          "[&[data-state=open]>svg]:rotate-180",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200"
          aria-hidden
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn("pt-0.5 pb-1", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
