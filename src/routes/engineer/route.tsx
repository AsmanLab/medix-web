import { createFileRoute, Outlet } from "@tanstack/react-router";
import { StaffShell } from "@/components/shared/StaffShell";
import { requireAuth } from "@/session/guards";

export const Route = createFileRoute("/engineer")({
  beforeLoad: () => requireAuth({ roles: ["service_engineer", "admin"] }),
  component: EngineerLayout,
});

function EngineerLayout() {
  return (
    <StaffShell title="Инженер" homeTo="/engineer">
      <Outlet />
    </StaffShell>
  );
}
