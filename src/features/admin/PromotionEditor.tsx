import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createAdminPromotion,
  deleteAdminPromotion,
  fetchAdminPromotion,
  updateAdminPromotion,
} from "@/api/cms-admin";
import { isAppError } from "@/api/errors";
import { fetchMediaDownloadUrl, uploadMediaFile } from "@/api/media";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { slugifyCategoryName } from "@/features/catalog/slugify";

const fieldClass =
  "mt-1.5 flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Props = { promotionId?: string };

function toDateInput(iso: string | null | undefined) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function fromDateInput(value: string) {
  if (!value.trim()) return null;
  return new Date(`${value}T00:00:00`).toISOString();
}

export function PromotionEditor({ promotionId }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(promotionId);

  const detailQuery = useQuery({
    queryKey: queryKeys.cms.adminPromotion(promotionId ?? ""),
    queryFn: ({ signal }) => fetchAdminPromotion(promotionId!, signal),
    enabled: isEdit,
  });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [imageKey, setImageKey] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sort, setSort] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [productIds, setProductIds] = useState("");
  const [uploading, setUploading] = useState(false);

  const previewQuery = useQuery({
    queryKey: ["media", "preview", imageKey],
    queryFn: ({ signal }) => fetchMediaDownloadUrl(imageKey, signal),
    enabled: Boolean(imageKey.trim()),
  });

  useEffect(() => {
    const p = detailQuery.data;
    if (!p) return;
    setTitle(p.title);
    setSlug(p.slug);
    setSlugTouched(true);
    setDescription(p.description);
    setImageKey(p.image_key);
    setLinkUrl(p.link_url);
    setSort(p.sort);
    setIsActive(p.is_active);
    setStartsAt(toDateInput(p.starts_at));
    setEndsAt(toDateInput(p.ends_at));
    setProductIds(p.product_ids.join("\n"));
  }, [detailQuery.data]);

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.cms.all });
  }

  function parseProductIds() {
    return productIds
      .split(/[\n,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !slug.trim()) {
        throw Object.assign(new Error("Заполните title и slug"), {
          status: 400,
          message: "Заполните title и slug",
        });
      }
      const body = {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim(),
        image_key: imageKey.trim(),
        link_url: linkUrl.trim(),
        sort,
        is_active: isActive,
        starts_at: fromDateInput(startsAt),
        ends_at: fromDateInput(endsAt),
        product_ids: parseProductIds(),
      };
      if (isEdit && promotionId) {
        return updateAdminPromotion(promotionId, body);
      }
      return createAdminPromotion(body);
    },
    onSuccess: async (res) => {
      toast.success("Акция сохранена");
      await invalidate();
      await navigate({
        to: "/admin/cms/promotions/$promotionId",
        params: { promotionId: res.id },
      });
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось сохранить");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminPromotion(promotionId!),
    onSuccess: async () => {
      toast.success("Акция удалена");
      await invalidate();
      await navigate({ to: "/admin/cms/promotions" });
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось удалить");
    },
  });

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const key = await uploadMediaFile("cms", file);
      setImageKey(key);
      toast.success("Изображение загружено");
    } catch (err) {
      toast.error(isAppError(err) ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/cms/promotions"
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
                if (window.confirm("Удалить акцию?")) deleteMutation.mutate();
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
            {isEdit ? "Редактирование акции" : "Новая акция"}
          </h1>

          <label className="block text-xs font-semibold">
            Название
            <input
              value={title}
              onChange={(e) => {
                const value = e.target.value;
                setTitle(value);
                if (!slugTouched && !isEdit) setSlug(slugifyCategoryName(value));
              }}
              className={fieldClass}
            />
          </label>

          <label className="block text-xs font-semibold">
            Slug
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              className={fieldClass}
            />
          </label>

          <label className="block text-xs font-semibold">
            Описание
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 min-h-[120px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold sm:col-span-2">
              Image key
              <input
                value={imageKey}
                onChange={(e) => setImageKey(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-primary">
              <Upload className="h-4 w-4" aria-hidden />
              {uploading ? "Загрузка…" : "Загрузить изображение"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
              />
            </label>
            {imageKey.trim() ? (
              <div className="sm:col-span-2 overflow-hidden rounded-2xl border border-border bg-muted">
                {previewQuery.data ? (
                  <img
                    src={previewQuery.data}
                    alt=""
                    className="max-h-56 w-full object-cover"
                  />
                ) : (
                  <div className="grid h-40 place-items-center text-sm text-muted-foreground">
                    {previewQuery.isLoading
                      ? "Загрузка превью…"
                      : "Не удалось загрузить превью"}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <label className="block text-xs font-semibold">
            Link URL
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className={fieldClass}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-xs font-semibold">
              Старт
              <input
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block text-xs font-semibold">
              Конец
              <input
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block text-xs font-semibold">
              Sort
              <input
                type="number"
                value={sort}
                onChange={(e) => setSort(Number(e.target.value) || 0)}
                className={fieldClass}
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Активна
          </label>

          <label className="block text-xs font-semibold">
            Product IDs (по одному в строке) — deep link в приложение
            <textarea
              value={productIds}
              onChange={(e) => setProductIds(e.target.value)}
              className="mt-1.5 min-h-[88px] w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
      </StateBlock>
    </div>
  );
}
