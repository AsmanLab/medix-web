import { createFileRoute } from "@tanstack/react-router";
import { requireStaffPanel } from "@/session/guards";
import { Users } from "lucide-react";

export const Route = createFileRoute("/admin/users/")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin", "manager"] }),
  component: UsersPage,
});

function UsersPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
          <Users className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Клиенты</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Страница появится после подключения API админки.
          </p>
        </div>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Заглушка: pending/unverified список, верификация, таймлайн.
      </div>
    </div>
  );
}

