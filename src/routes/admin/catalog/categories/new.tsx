import { createFileRoute } from "@tanstack/react-router";
import { CategoryEditor } from "@/features/admin/CategoryEditor";
import { requireStaffPanel } from "@/session/guards";

type NewCategorySearch = {
  parent_id?: string;
};

export const Route = createFileRoute("/admin/catalog/categories/new")({
  validateSearch: (search: Record<string, unknown>): NewCategorySearch => ({
    parent_id:
      typeof search.parent_id === "string" ? search.parent_id : undefined,
  }),
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: NewCategoryPage,
});

function NewCategoryPage() {
  const { parent_id } = Route.useSearch();
  return <CategoryEditor initialParentId={parent_id} />;
}
