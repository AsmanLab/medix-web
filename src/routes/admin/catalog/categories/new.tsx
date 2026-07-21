import { createFileRoute } from "@tanstack/react-router";
import { CategoryEditor } from "@/features/admin/CategoryEditor";
import { requireStaffPanel } from "@/session/guards";

export const Route = createFileRoute("/admin/catalog/categories/new")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: NewCategoryPage,
});

function NewCategoryPage() {
  return <CategoryEditor />;
}
