import { createFileRoute } from "@tanstack/react-router";
import { requireStaffPanel } from "@/session/guards";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/admin/cms/")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: CmsAdminPage,
});

function CmsAdminPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
          <Megaphone className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">CMS</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Заглушка управления страницами и блоками.
          </p>
        </div>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
        TODO: CRUD страниц, промо и SEO.
      </div>
    </div>
  );
}

