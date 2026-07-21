import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createAdminCategory,
  deleteAdminCategory,
  fetchAdminCategories,
  updateAdminCategory,
  type CategoryOut,
} from "@/api/catalog";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { slugifyCategoryName } from "@/features/catalog/slugify";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-1.5 flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const textareaClass =
  "mt-1.5 min-h-[88px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type CategoryEditorProps = {
  categoryId?: string;
};

export function CategoryEditor({ categoryId }: CategoryEditorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(categoryId);

  const listQuery = useQuery({
    queryKey: queryKeys.catalog.adminCategories(),
    queryFn: ({ signal }) => fetchAdminCategories(signal),
  });

  const existing = useMemo(() => {
    if (!categoryId || !listQuery.data) return null;
    return listQuery.data.find((c) => c.id === categoryId) ?? null;
  }, [categoryId, listQuery.data]);

  const [nameRu, setNameRu] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [parentId, setParentId] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [imageKey, setImageKey] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sort, setSort] = useState(0);

  useEffect(() => {
    if (!existing) return;
    setNameRu(existing.name_ru);
    setNameEn(existing.name_en ?? "");
    setSlug(existing.slug);
    setSlugTouched(true);
    setParentId(existing.parent_id ?? "");
    setSeoTitle(existing.seo_title ?? "");
    setSeoDescription(existing.seo_description ?? "");
    setImageKey(existing.image_key ?? "");
    setIsActive(existing.is_active);
    setSort(existing.sort);
  }, [existing]);

  const parentOptions = useMemo(() => {
    const all = listQuery.data ?? [];
    return all.filter((c) => c.id !== categoryId);
  }, [listQuery.data, categoryId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name_ru: nameRu.trim(),
        name_en: nameEn.trim(),
        slug: slug.trim(),
        parent_id: parentId || null,
        seo_title: seoTitle.trim(),
        seo_description: seoDescription.trim(),
        image_key: imageKey.trim(),
        is_active: isActive,
        sort,
      };
      if (isEdit && categoryId) {
        return updateAdminCategory(categoryId, body);
      }
      return createAdminCategory(body);
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.catalog.all,
      });
      toast.success(isEdit ? "Категория сохранена" : "Категория создана");
      if (!isEdit) {
        await navigate({
          to: "/admin/catalog/categories/$categoryId",
          params: { categoryId: saved.id },
        });
      }
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось сохранить");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminCategory(categoryId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.catalog.all,
      });
      toast.success("Категория удалена");
      await navigate({ to: "/admin/catalog/categories" });
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось удалить");
    },
  });

  function onNameChange(value: string) {
    setNameRu(value);
    if (!slugTouched) {
      setSlug(slugifyCategoryName(value));
    }
  }

  const notFound = isEdit && listQuery.isSuccess && !existing;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          to="/admin/catalog/categories"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />К категориям
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold">
          {isEdit ? "Редактирование категории" : "Новая категория"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Название, slug, родитель и SEO для витрины
        </p>
      </div>

      <StateBlock
        isLoading={isEdit && listQuery.isLoading}
        isError={listQuery.isError}
        error={listQuery.error}
        onRetry={() => void listQuery.refetch()}
        isEmpty={notFound}
        emptyTitle="Категория не найдена"
        emptyDescription="Возможно, её уже удалили."
      >
        <form
          className="space-y-5 rounded-3xl border border-border bg-card p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nameRu.trim() || !slug.trim()) {
              toast.error("Укажите название и slug");
              return;
            }
            saveMutation.mutate();
          }}
        >
          <label className="block text-xs font-semibold">
            Название (RU) *
            <input
              required
              value={nameRu}
              onChange={(e) => onNameChange(e.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="block text-xs font-semibold">
            Название (EN)
            <input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="block text-xs font-semibold">
            Slug *
            <input
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              className={cn(fieldClass, "font-mono text-xs")}
            />
          </label>

          <label className="block text-xs font-semibold">
            Родительская категория
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className={fieldClass}
            >
              <option value="">Корневая категория</option>
              {parentOptions.map((c: CategoryOut) => (
                <option key={c.id} value={c.id}>
                  {c.name_ru} ({c.slug})
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold">
              Порядок (sort)
              <input
                type="number"
                value={sort}
                onChange={(e) => setSort(Number(e.target.value) || 0)}
                className={fieldClass}
              />
            </label>
            <label className="flex items-end gap-3 pb-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Активна на витрине
            </label>
          </div>

          <label className="block text-xs font-semibold">
            Image key (S3)
            <input
              value={imageKey}
              onChange={(e) => setImageKey(e.target.value)}
              placeholder="categories/…"
              className={cn(fieldClass, "font-mono text-xs")}
            />
          </label>

          <label className="block text-xs font-semibold">
            SEO title
            <input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="block text-xs font-semibold">
            SEO description
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              className={textareaClass}
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {isEdit ? (
              <Button
                type="button"
                variant="outline"
                className="text-destructive"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      "Удалить категорию? Действие нельзя отменить.",
                    )
                  ) {
                    deleteMutation.mutate();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Удалить
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={saveMutation.isPending}>
              <Save className="h-4 w-4" aria-hidden />
              {saveMutation.isPending ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        </form>
      </StateBlock>
    </div>
  );
}
