import { createFileRoute } from "@tanstack/react-router";
import { ProductEditor } from "@/features/admin/ProductEditor";
import { requireStaffPanel } from "@/session/guards";

export const Route = createFileRoute("/admin/catalog/products/$productId")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: EditProductPage,
});

function EditProductPage() {
  const { productId } = Route.useParams();
  return <ProductEditor productId={productId} />;
}
