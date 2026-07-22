import { createFileRoute } from "@tanstack/react-router";
import { CmsPageEditor } from "@/features/admin/CmsPageEditor";
import { requireStaffPanel } from "@/session/guards";

export const Route = createFileRoute("/admin/cms/pages/new")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: () => <CmsPageEditor />,
});
