import { createFileRoute } from "@tanstack/react-router";
import { CmsPageEditor } from "@/features/admin/CmsPageEditor";
import { requireStaffPanel } from "@/session/guards";

type NewPageSearch = { slug?: string };

export const Route = createFileRoute("/admin/cms/pages/new")({
  // ?slug=about — переход из «Страниц сайта» (routes/admin/cms/pages/index.tsx),
  // предзаполняет известную страницу, чтобы slug не пришлось вводить руками.
  validateSearch: (search: Record<string, unknown>): NewPageSearch => ({
    slug: typeof search.slug === "string" ? search.slug : undefined,
  }),
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: NewCmsPageRoute,
});

function NewCmsPageRoute() {
  const { slug } = Route.useSearch();
  return <CmsPageEditor prefillSlug={slug} />;
}
