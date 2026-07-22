import { createFileRoute } from "@tanstack/react-router";
import { PromotionEditor } from "@/features/admin/PromotionEditor";
import { requireStaffPanel } from "@/session/guards";

export const Route = createFileRoute("/admin/cms/promotions/$promotionId")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: CmsPromotionEditRoute,
});

function CmsPromotionEditRoute() {
  const { promotionId } = Route.useParams();
  return <PromotionEditor promotionId={promotionId} />;
}
