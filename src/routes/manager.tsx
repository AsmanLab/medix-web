import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/session/guards";
import { StaffShell } from "@/components/shared/StaffShell";

export const Route = createFileRoute("/manager")({
  beforeLoad: () => requireAuth({ roles: ["manager"] }),
  component: ManagerPage,
});

function ManagerPage() {
  return (
    <StaffShell title="Менеджер" homeTo="/manager">
      <div className="rounded-3xl border border-border bg-card p-6">
        <h1 className="font-display text-2xl font-bold">Кабинет менеджера</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Очередь RFQ и котировки — фаза G8.
        </p>
      </div>
    </StaffShell>
  );
}
