import { createFileRoute } from "@tanstack/react-router";
import { requireStaffPanel } from "@/session/guards";
import { Package } from "lucide-react";

export const Route = createFileRoute("/admin/commerce/")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin", "manager"] }),
  component: AdminCommercePage,
});

function AdminCommercePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
          <Package className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Коммерция</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            RFQ / заказы: очередь и обработка (пока заглушка).
          </p>
        </div>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
        TODO: очередь RFQ, создание/подтверждение котировок, список заказов.
      </div>
    </div>
  );
}

