import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createAdminBanner,
  deleteAdminBanner,
  listAdminBanners,
  updateAdminBanner,
  type AdminBanner,
} from "@/api/cms-admin";
import { isAppError } from "@/api/errors";
import { fetchMediaDownloadUrl, uploadMediaFile } from "@/api/media";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { requireStaffPanel } from "@/session/guards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/banners/")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: BannersAdminPage,
});

const fieldClass =
  "mt-1.5 flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type FormState = {
  image_key: string;
  title: string;
  subtitle: string;
  cta_text: string;
  link_url: string;
  deep_link: string;
  sort: number;
  is_enabled: boolean;
};

const emptyForm = (): FormState => ({
  image_key: "",
  title: "",
  subtitle: "",
  cta_text: "",
  link_url: "",
  deep_link: "",
  sort: 0,
  is_enabled: true,
});

function BannersAdminPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);

  const listQuery = useQuery({
    queryKey: queryKeys.cms.adminBanners(),
    queryFn: ({ signal }) => listAdminBanners(signal),
  });

  const previewQuery = useQuery({
    queryKey: ["media", "banner-preview", form.image_key],
    queryFn: ({ signal }) => fetchMediaDownloadUrl(form.image_key, signal),
    enabled: Boolean(form.image_key.trim()),
  });

  async function invalidate() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.cms.adminBanners(),
    });
    await queryClient.invalidateQueries({ queryKey: queryKeys.cms.banners() });
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function startEdit(banner: AdminBanner) {
    setEditingId(banner.id);
    setForm({
      image_key: banner.image_key,
      title: banner.title,
      subtitle: banner.subtitle,
      cta_text: banner.cta_text,
      link_url: banner.link_url,
      deep_link: banner.deep_link,
      sort: banner.sort,
      is_enabled: banner.is_enabled,
    });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.image_key.trim()) {
        throw new Error("Загрузите изображение баннера");
      }
      if (editingId) {
        return updateAdminBanner(editingId, form);
      }
      return createAdminBanner(form);
    },
    onSuccess: async () => {
      toast.success(editingId ? "Баннер обновлён" : "Баннер создан");
      await invalidate();
      startCreate();
    },
    onError: (err: unknown) => {
      toast.error(isAppError(err) ? err.message : "Не удалось сохранить");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminBanner(id),
    onSuccess: async () => {
      toast.success("Баннер удалён");
      await invalidate();
      if (editingId) startCreate();
    },
    onError: (err: unknown) => {
      toast.error(isAppError(err) ? err.message : "Не удалось удалить");
    },
  });

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const key = await uploadMediaFile("cms", file);
      setForm((prev) => ({ ...prev, image_key: key }));
      toast.success("Изображение загружено");
    } catch (err) {
      toast.error(isAppError(err) ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (!editingId) return;
    const stillThere = (listQuery.data ?? []).some((b) => b.id === editingId);
    if (listQuery.isSuccess && !stillThere) startCreate();
  }, [editingId, listQuery.data, listQuery.isSuccess]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
            <Megaphone className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Баннеры</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Слайды главной страницы · image, CTA, sort, enabled
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={startCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          Новый
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <StateBlock
          isLoading={listQuery.isLoading}
          isError={listQuery.isError}
          error={listQuery.error}
          onRetry={() => void listQuery.refetch()}
          isEmpty={listQuery.isSuccess && (listQuery.data?.length ?? 0) === 0}
          emptyTitle="Нет баннеров"
          emptyDescription="Создайте первый слайд для главной."
        >
          <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
            {(listQuery.data ?? []).map((banner) => (
              <li key={banner.id}>
                <button
                  type="button"
                  onClick={() => startEdit(banner)}
                  className={cn(
                    "flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-secondary/40",
                    editingId === banner.id && "bg-primary-soft/40",
                  )}
                >
                  <div>
                    <div className="font-semibold">
                      {banner.title || "Без заголовка"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      sort {banner.sort}
                      {banner.cta_text ? ` · ${banner.cta_text}` : ""}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase",
                      banner.is_enabled
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {banner.is_enabled ? "On" : "Off"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </StateBlock>

        <section className="space-y-4 rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold">
            {editingId ? "Редактирование" : "Новый баннер"}
          </h2>

          <label className="block text-xs font-semibold">
            Заголовок
            <input
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className={fieldClass}
            />
          </label>

          <label className="block text-xs font-semibold">
            Подзаголовок
            <input
              value={form.subtitle}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, subtitle: e.target.value }))
              }
              className={fieldClass}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold">
              CTA
              <input
                value={form.cta_text}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, cta_text: e.target.value }))
                }
                className={fieldClass}
              />
            </label>
            <label className="block text-xs font-semibold">
              Sort
              <input
                type="number"
                value={form.sort}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sort: Number(e.target.value) || 0,
                  }))
                }
                className={fieldClass}
              />
            </label>
          </div>

          <label className="block text-xs font-semibold">
            Link URL
            <input
              value={form.link_url}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, link_url: e.target.value }))
              }
              className={fieldClass}
            />
          </label>

          <label className="block text-xs font-semibold">
            Deep link
            <input
              value={form.deep_link}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, deep_link: e.target.value }))
              }
              className={fieldClass}
            />
          </label>

          <label className="block text-xs font-semibold">
            Image key
            <input
              value={form.image_key}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, image_key: e.target.value }))
              }
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

          {form.image_key.trim() ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-muted">
              {previewQuery.data ? (
                <img
                  src={previewQuery.data}
                  alt=""
                  className="max-h-48 w-full object-cover"
                />
              ) : (
                <div className="grid h-32 place-items-center text-sm text-muted-foreground">
                  {previewQuery.isLoading
                    ? "Загрузка превью…"
                    : "Нет превью"}
                </div>
              )}
            </div>
          ) : null}

          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.is_enabled}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  is_enabled: e.target.checked,
                }))
              }
            />
            Показывать на главной
          </label>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              <Save className="h-4 w-4" aria-hidden />
              Сохранить
            </Button>
            {editingId ? (
              <Button
                variant="outline"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (window.confirm("Удалить баннер?")) {
                    deleteMutation.mutate(editingId);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Удалить
              </Button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
