import { createFileRoute } from "@tanstack/react-router";
import { CategoryEditor } from "@/features/admin/CategoryEditor";
import { requireStaffPanel } from "@/session/guards";

export const Route = createFileRoute("/admin/catalog/categories/$categoryId")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: EditCategoryPage,
});

function EditCategoryPage() {
  const { categoryId } = Route.useParams();
  return <CategoryEditor categoryId={categoryId} />;
}
