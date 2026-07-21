import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, FolderTree } from "lucide-react";
import { requireStaffPanel } from "@/session/guards";

export const Route = createFileRoute("/admin/catalog/")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: AdminCatalogPage,
});

function AdminCatalogPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
          <Boxes className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Каталог</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Управление структурой категорий и товарами
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/admin/catalog/categories"
          className="flex items-start gap-3 rounded-3xl border border-border bg-card p-5 transition hover:border-primary/40"
        >
          <FolderTree className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
          <div>
            <div className="font-semibold">Категории</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Дерево, статус, порядок и SEO
            </p>
          </div>
        </Link>
        <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
          Товары — следующий этап админки каталога
        </div>
      </div>
    </div>
  );
}
