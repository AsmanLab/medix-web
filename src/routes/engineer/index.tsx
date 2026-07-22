import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import { fetchEngineerQueue } from "@/api/service-requests";
import { queryKeys } from "@/api/query-keys";
import { ServiceDeskQueue } from "@/features/service/ServiceDeskQueue";

export const Route = createFileRoute("/engineer/")({
  component: EngineerQueuePage,
});

function EngineerQueuePage() {
  const queueQuery = useQuery({
    queryKey: queryKeys.service.engineerQueue(),
    queryFn: ({ signal }) => fetchEngineerQueue(signal),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
          <Wrench className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Очередь заявок</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Новые, в работе и завершённые сервисные заявки
          </p>
        </div>
      </header>

      <ServiceDeskQueue
        items={queueQuery.data}
        isLoading={queueQuery.isLoading}
        isError={queueQuery.isError}
        error={queueQuery.error}
        onRetry={() => void queueQuery.refetch()}
        detailMode="engineer"
      />
    </div>
  );
}
