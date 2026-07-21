import { createFileRoute } from "@tanstack/react-router";
import { requireStaffPanel } from "@/session/guards";
import { Wrench } from "lucide-react";

export const Route = createFileRoute("/admin/service-desk/")({
  beforeLoad: () =>
    requireStaffPanel({
      roles: ["admin", "manager", "service_engineer"],
    }),
  component: ServiceDeskAdminPage,
});

function ServiceDeskAdminPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
          <Wrench className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Сервисная служба</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Очередь сервисных заявок и выполнение работ (заглушка).
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
        TODO: список заявок, детали, смена статусов, таймлайн.
      </div>
    </div>
  );
}

