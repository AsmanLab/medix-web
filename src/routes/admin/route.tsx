import { createFileRoute, Outlet } from "@tanstack/react-router";
import { StaffShell } from "@/components/shared/StaffShell";
import { requireAdmin } from "@/session/guards";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireAdmin(),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <StaffShell title="Админ" homeTo="/admin">
      <Outlet />
    </StaffShell>
  );
}
