import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/session/guards";
import { StaffShell } from "@/components/shared/StaffShell";

export const Route = createFileRoute("/engineer")({
  beforeLoad: () => requireAuth({ roles: ["service_engineer"] }),
  component: EngineerPage,
});

function EngineerPage() {
  return (
    <StaffShell title="Инженер" homeTo="/engineer">
      <div className="rounded-3xl border border-border bg-card p-6">
        <h1 className="font-display text-2xl font-bold">
          Кабинет сервисного инженера
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Очередь заявок — фаза G8.
        </p>
      </div>
    </StaffShell>
  );
}
