import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import {
  fetchEngineerQueue,
  listManagerServiceRequests,
} from "@/api/service-requests";
import { queryKeys } from "@/api/query-keys";
import { ServiceDeskQueue } from "@/features/service/ServiceDeskQueue";
import { requireStaffPanel } from "@/session/guards";
import { useSession } from "@/session/store";

export const Route = createFileRoute("/admin/service-desk/")({
  beforeLoad: () =>
    requireStaffPanel({
      roles: ["admin", "manager", "service_engineer"],
    }),
  component: ServiceDeskAdminPage,
});

function ServiceDeskAdminPage() {
  const { user } = useSession();
  const isEngineerOnly = user?.role === "service_engineer";

  const queueQuery = useQuery({
    queryKey: isEngineerOnly
      ? queryKeys.service.engineerQueue()
      : queryKeys.service.managerList(),
    queryFn: ({ signal }) =>
      isEngineerOnly
        ? fetchEngineerQueue(signal)
        : listManagerServiceRequests(signal),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
          <Wrench className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Сервисная служба</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEngineerOnly
              ? "Ваша очередь сервисных заявок"
              : "Все заявки: назначение инженера и статусы"}
          </p>
        </div>
      </header>

      <ServiceDeskQueue
        items={queueQuery.data}
        isLoading={queueQuery.isLoading}
        isError={queueQuery.isError}
        error={queueQuery.error}
        onRetry={() => void queueQuery.refetch()}
        detailMode="admin"
      />
    </div>
  );
}
