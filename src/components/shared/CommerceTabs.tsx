import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type CommerceTabsProps = {
  active: "requests" | "orders";
};

/** Segmented control: My Requests / My Orders (#18/#19). */
export function CommerceTabs({ active }: CommerceTabsProps) {
  return (
    <div
      className="mt-5 grid grid-cols-2 rounded-xl border border-border bg-secondary/40 p-1"
      role="tablist"
      aria-label="Заявки и заказы"
    >
      <Link
        to="/requests"
        role="tab"
        aria-selected={active === "requests"}
        className={cn(
          "rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition",
          active === "requests"
            ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Заявки
      </Link>
      <Link
        to="/orders"
        role="tab"
        aria-selected={active === "orders"}
        className={cn(
          "rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition",
          active === "orders"
            ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Заказы
      </Link>
    </div>
  );
}
