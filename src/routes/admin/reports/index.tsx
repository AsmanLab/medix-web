import { createFileRoute } from "@tanstack/react-router";
import { requireStaffPanel } from "@/session/guards";
import { FileUp } from "lucide-react";

export const Route = createFileRoute("/admin/reports/")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: ReportsAdminPage,
});

function ReportsAdminPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
          <FileUp className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Отчёты</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Заглушка. Отчётность появится после подключения API.
          </p>
        </div>
      </div>
    </div>
  );
}

