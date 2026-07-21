import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { requireAuth } from "@/session/guards";

export const Route = createFileRoute("/manager")({
  beforeLoad: async () => {
    await requireAuth({ roles: ["manager"] });
    throw redirect({ to: "/admin/commerce" });
  },
  component: ManagerRedirectPage,
});

function ManagerRedirectPage() {
  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <p className="text-sm text-muted-foreground">
        Перенаправление в очередь RFQ…
      </p>
      <Link
        to="/admin/commerce"
        className="mt-3 inline-block text-sm font-semibold text-primary"
      >
        Открыть коммерцию
      </Link>
    </div>
  );
}
