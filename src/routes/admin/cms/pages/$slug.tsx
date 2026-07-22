import { createFileRoute } from "@tanstack/react-router";
import { CmsPageEditor } from "@/features/admin/CmsPageEditor";
import { requireStaffPanel } from "@/session/guards";

export const Route = createFileRoute("/admin/cms/pages/$slug")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: CmsPageEditRoute,
});

function CmsPageEditRoute() {
  const { slug } = Route.useParams();
  return <CmsPageEditor slug={slug} />;
}
