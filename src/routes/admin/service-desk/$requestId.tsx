import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ServiceDeskDetail } from "@/features/service/ServiceDeskDetail";
import { requireStaffPanel } from "@/session/guards";
import { useSession } from "@/session/store";

export const Route = createFileRoute("/admin/service-desk/$requestId")({
  beforeLoad: () =>
    requireStaffPanel({
      roles: ["admin", "manager", "service_engineer"],
    }),
  component: ServiceDeskAdminDetailPage,
});

function ServiceDeskAdminDetailPage() {
  const { requestId } = Route.useParams();
  const { user } = useSession();
  const allowAssign = user?.role === "admin" || user?.role === "manager";

  return (
    <div className="space-y-6">
      <Link
        to="/admin/service-desk"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />К очереди
      </Link>
      <ServiceDeskDetail requestId={requestId} allowAssign={allowAssign} />
    </div>
  );
}
