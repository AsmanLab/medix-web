import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ServiceDeskDetail } from "@/features/service/ServiceDeskDetail";

export const Route = createFileRoute("/engineer/$requestId")({
  component: EngineerRequestDetailPage,
});

function EngineerRequestDetailPage() {
  const { requestId } = Route.useParams();

  return (
    <div className="space-y-6">
      <Link
        to="/engineer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />К очереди
      </Link>
      <ServiceDeskDetail requestId={requestId} />
    </div>
  );
}
