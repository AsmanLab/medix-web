import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center",
        className,
      )}
      role="status"
    >
      {Icon ? (
        <Icon className="mx-auto h-8 w-8 text-primary" aria-hidden />
      ) : null}
      <p className={cn("font-semibold text-foreground", Icon && "mt-3")}>
        {title}
      </p>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
