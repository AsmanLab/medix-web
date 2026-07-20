import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAuth } from "@/session/guards";

export const Route = createFileRoute("/orders")({
  beforeLoad: () => requireAuth({ roles: ["client"] }),
  component: () => <Outlet />,
});
