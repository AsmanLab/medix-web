import { createFileRoute } from "@tanstack/react-router";
import { PromotionEditor } from "@/features/admin/PromotionEditor";
import { requireStaffPanel } from "@/session/guards";

export const Route = createFileRoute("/admin/cms/promotions/new")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: () => <PromotionEditor />,
});
