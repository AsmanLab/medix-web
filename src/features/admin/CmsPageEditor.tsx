import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createAdminCmsPage,
  deleteAdminCmsPage,
  fetchAdminCmsPage,
  updateAdminCmsPage,
} from "@/api/cms-admin";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { slugifyCategoryName } from "@/features/catalog/slugify";

type Props = { slug?: string };

export function CmsPageEditor({ slug }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(slug);

  const detailQuery = useQuery({
    queryKey: queryKeys.cms.adminPage(slug ?? ""),
    queryFn: ({ signal }) => fetchAdminCmsPage(slug!, signal),
    enabled: isEdit,
  });

  const [title, setTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [bodyHtml, setBodyHtml] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [status, setStatus] = useState("draft");

  useEffect(() => {
    const page = detailQuery.data;
    if (!page) return;
    setTitle(page.title);
    setPageSlug(page.slug);
    setSlugTouched(true);
    setBodyHtml(page.body_html);
    setSeoTitle(page.seo_title);
    setSeoDescription(page.seo_description);
    setStatus(page.status);
  }, [detailQuery.data]);

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.cms.all });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !pageSlug.trim()) {
        throw Object.assign(new Error("Заполните title и slug"), {
          status: 400,
          message: "Заполните title и slug",
        });
      }
      if (isEdit && slug) {
        return updateAdminCmsPage(slug, {
          title: title.trim(),
          body_html: bodyHtml,
          seo_title: seoTitle.trim(),
          seo_description: seoDescription.trim(),
          status,
        });
      }
      return createAdminCmsPage({
        slug: pageSlug.trim(),
        title: title.trim(),
        body_html: bodyHtml,
        seo_title: seoTitle.trim(),
        seo_description: seoDescription.trim(),
        status,
      });
    },
    onSuccess: async (res) => {
      toast.success("Страница сохранена");
      await invalidate();
      const nextSlug = "slug" in res ? res.slug : pageSlug.trim();
      await navigate({
        to: "/admin/cms/pages/$slug",
        params: { slug: nextSlug },
      });
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось сохранить");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminCmsPage(slug!),
    onSuccess: async () => {
      toast.success("Страница удалена");
      await invalidate();
      await navigate({ to: "/admin/cms/pages" });
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось удалить");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/cms/pages"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />К списку
        </Link>
        <div className="flex flex-wrap gap-2">
          {isEdit ? (
            <Button
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm("Удалить страницу?")) deleteMutation.mutate();
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Удалить
            </Button>
          ) : null}
          <Button
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            <Save className="h-4 w-4" aria-hidden />
            Сохранить
          </Button>
        </div>
      </div>

      <StateBlock
        isLoading={isEdit && detailQuery.isLoading}
        isError={isEdit && detailQuery.isError}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
      >
        <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
          <h1 className="font-display text-2xl font-bold">
            {isEdit ? "Редактирование страницы" : "Новая страница"}
          </h1>

          <label className="block text-xs font-semibold">
            Заголовок
            <input
              value={title}
              onChange={(e) => {
                const value = e.target.value;
                setTitle(value);
                if (!slugTouched && !isEdit) {
                  setPageSlug(slugifyCategoryName(value));
                }
              }}
              className="field-control mt-1.5"
            />
          </label>

          <label className="block text-xs font-semibold">
            Slug
            <input
              value={pageSlug}
              disabled={isEdit}
              onChange={(e) => {
                setSlugTouched(true);
                setPageSlug(e.target.value);
              }}
              className="field-control mt-1.5"
            />
          </label>

          <label className="block text-xs font-semibold">
            Статус
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="field-control mt-1.5"
            >
              <option value="draft">Черновик</option>
              <option value="published">Опубликовано</option>
            </select>
          </label>

          <label className="block text-xs font-semibold">
            HTML содержимое
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              className="field-control mt-1.5 min-h-[200px] py-2 font-mono"
            />
          </label>

          <label className="block text-xs font-semibold">
            SEO title
            <input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className="field-control mt-1.5"
            />
          </label>

          <label className="block text-xs font-semibold">
            SEO description
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              className="mt-1.5 min-h-[88px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
      </StateBlock>
    </div>
  );
}
