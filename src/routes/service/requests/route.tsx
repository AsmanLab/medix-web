import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAuth } from "@/session/guards";

export const Route = createFileRoute("/service/requests")({
  beforeLoad: () => requireAuth({ roles: ["client"] }),
  component: () => <Outlet />,
});
