import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireStaffPanel } from "@/session/guards";

export const Route = createFileRoute("/admin")({
  beforeLoad: () =>
    requireStaffPanel({ roles: ["admin", "manager", "service_engineer"] }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
