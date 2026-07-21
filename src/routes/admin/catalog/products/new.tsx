import { createFileRoute } from "@tanstack/react-router";
import { ProductEditor } from "@/features/admin/ProductEditor";
import { requireStaffPanel } from "@/session/guards";

export const Route = createFileRoute("/admin/catalog/products/new")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: NewProductPage,
});

function NewProductPage() {
  return <ProductEditor />;
}
