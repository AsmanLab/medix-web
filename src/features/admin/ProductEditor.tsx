import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  ImagePlus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  attachAdminProductDocument,
  attachAdminProductImage,
  createAdminProduct,
  deleteAdminProduct,
  detachAdminProductDocument,
  detachAdminProductImage,
  fetchAdminCategories,
  fetchAdminProduct,
  publishAdminProduct,
  unpublishAdminProduct,
  updateAdminProduct,
  type ProductDetailOut,
} from "@/api/catalog";
import { isAppError } from "@/api/errors";
import { fetchMediaDownloadUrl, uploadMediaFile } from "@/api/media";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { slugifyCategoryName } from "@/features/catalog/slugify";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-1.5 flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const textareaClass =
  "mt-1.5 min-h-[100px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Tab = "main" | "price" | "images" | "documents";

type ProductEditorProps = {
  productId?: string;
};

export function ProductEditor({ productId }: ProductEditorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(productId);
  const [tab, setTab] = useState<Tab>("main");

  const detailQuery = useQuery({
    queryKey: queryKeys.catalog.adminProduct(productId ?? ""),
    queryFn: ({ signal }) => fetchAdminProduct(productId!, signal),
    enabled: isEdit,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.adminCategories(),
    queryFn: ({ signal }) => fetchAdminCategories(signal),
  });

  const existing = detailQuery.data ?? null;

  const [nameRu, setNameRu] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [sku, setSku] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [country, setCountry] = useState("");
  const [descriptionRu, setDescriptionRu] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [availability, setAvailability] = useState("on_order");
  const [priceOnRequest, setPriceOnRequest] = useState(true);
  const [priceAmount, setPriceAmount] = useState("");
  const [published, setPublished] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!existing) return;
    setNameRu(existing.name_ru);
    setNameEn(existing.name_en ?? "");
    setSlug(existing.slug);
    setSlugTouched(true);
    setSku(existing.sku);
    setManufacturer(existing.manufacturer ?? "");
    setCountry(existing.country ?? "");
    setDescriptionRu(existing.description_ru ?? "");
    setCategoryIds(existing.category_ids ?? []);
    setAvailability(existing.availability || "on_order");
    setPriceOnRequest(!existing.price);
    setPriceAmount(existing.price ? String(existing.price) : "");
    setPublished(existing.is_published);
  }, [existing]);

  useEffect(() => {
    if (!existing?.images?.length) {
      setImageUrls({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        existing.images.map(async (img) => {
          if (img.url) return [img.id, img.url] as const;
          const url = await fetchMediaDownloadUrl(img.s3_key);
          return [img.id, url ?? ""] as const;
        }),
      );
      if (!cancelled) {
        setImageUrls(Object.fromEntries(entries.filter(([, u]) => u)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [existing]);

  const categories = categoriesQuery.data ?? [];

  async function invalidateAll() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsedPrice = priceOnRequest
        ? null
        : Number(priceAmount.replace(",", "."));
      if (
        !priceOnRequest &&
        (Number.isNaN(parsedPrice) || (parsedPrice ?? 0) < 0)
      ) {
        throw Object.assign(new Error("Укажите корректную цену"), {
          status: 400,
          message: "Укажите корректную цену",
        });
      }
      const body = {
        sku: sku.trim(),
        name_ru: nameRu.trim(),
        name_en: nameEn.trim(),
        slug: slug.trim(),
        category_ids: categoryIds,
        manufacturer: manufacturer.trim(),
        country: country.trim(),
        description_ru: descriptionRu.trim(),
        availability,
        price_amount: parsedPrice,
      };
      if (isEdit && productId) {
        return updateAdminProduct(productId, body);
      }
      return createAdminProduct(body);
    },
    onSuccess: async (saved) => {
      await invalidateAll();
      toast.success(isEdit ? "Товар сохранён" : "Товар создан");
      if (!isEdit) {
        await navigate({
          to: "/admin/catalog/products/$productId",
          params: { productId: saved.id },
        });
      } else if (productId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.catalog.adminProduct(productId),
        });
      }
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось сохранить");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (!productId) return;
      if (next) await publishAdminProduct(productId);
      else await unpublishAdminProduct(productId);
    },
    onSuccess: async (_, next) => {
      setPublished(next);
      await invalidateAll();
      if (productId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.catalog.adminProduct(productId),
        });
      }
      toast.success(next ? "Опубликован" : "Снят с публикации");
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось изменить статус");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminProduct(productId!),
    onSuccess: async () => {
      await invalidateAll();
      toast.success("Товар удалён");
      await navigate({ to: "/admin/catalog/products" });
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось удалить");
    },
  });

  const imageMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!productId) throw new Error("save first");
      const key = await uploadMediaFile("products", file);
      return attachAdminProductImage(productId, {
        s3_key: key,
        is_primary: (existing?.images?.length ?? 0) === 0,
      });
    },
    onSuccess: async () => {
      await invalidateAll();
      if (productId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.catalog.adminProduct(productId),
        });
      }
      toast.success("Изображение добавлено");
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось загрузить фото");
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) =>
      detachAdminProductImage(productId!, imageId),
    onSuccess: async () => {
      await invalidateAll();
      if (productId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.catalog.adminProduct(productId),
        });
      }
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось удалить фото");
    },
  });

  const documentMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!productId) throw new Error("save first");
      const key = await uploadMediaFile("documents", file);
      return attachAdminProductDocument(productId, {
        name: file.name || "document.pdf",
        s3_key: key,
      });
    },
    onSuccess: async () => {
      await invalidateAll();
      if (productId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.catalog.adminProduct(productId),
        });
      }
      toast.success("Документ добавлен");
    },
    onError: (err) => {
      toast.error(
        isAppError(err) ? err.message : "Не удалось загрузить документ",
      );
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: string) =>
      detachAdminProductDocument(productId!, documentId),
    onSuccess: async () => {
      await invalidateAll();
      if (productId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.catalog.adminProduct(productId),
        });
      }
    },
    onError: (err) => {
      toast.error(
        isAppError(err) ? err.message : "Не удалось удалить документ",
      );
    },
  });

  function onNameChange(value: string) {
    setNameRu(value);
    if (!slugTouched) setSlug(slugifyCategoryName(value));
  }

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const tabs: [Tab, string][] = useMemo(
    () => [
      ["main", "Основное"],
      ["price", "Цена и наличие"],
      ["images", "Изображения"],
      ["documents", "Документы"],
    ],
    [],
  );

  const notFound = isEdit && detailQuery.isSuccess && !existing;
  const mediaLocked = !isEdit;

  return (
    <div className="max-w-4xl space-y-5 pb-16">
      <div className="flex items-start gap-3">
        <Link
          to="/admin/catalog/products"
          className="mt-1 inline-flex text-sm font-semibold text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold">
              {isEdit ? nameRu || "Товар" : "Новый товар"}
            </h1>
            <span
              className={cn(
                "rounded-lg px-2 py-1 text-[10px] font-bold uppercase",
                published
                  ? "bg-emerald-500/15 text-emerald-700"
                  : "bg-amber-500/15 text-amber-700",
              )}
            >
              {published ? "Опубликован" : "Черновик"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEdit
              ? `${sku || "—"} · сохраните поля, затем медиа`
              : "Сначала сохраните черновик, потом загрузите фото и документы"}
          </p>
        </div>
        {isEdit ? (
          <Button
            type="button"
            variant="outline"
            disabled={publishMutation.isPending}
            onClick={() => publishMutation.mutate(!published)}
          >
            {published ? "Снять с публикации" : "Опубликовать"}
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full rounded-xl border border-border bg-card p-1 sm:min-w-0">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-semibold transition",
                tab === id
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <StateBlock
        isLoading={isEdit && detailQuery.isLoading}
        isError={detailQuery.isError}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        isEmpty={notFound}
        emptyTitle="Товар не найден"
      >
        <form
          className="space-y-5 rounded-3xl border border-border bg-card p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nameRu.trim() || !slug.trim() || !sku.trim()) {
              toast.error("Укажите название, slug и SKU");
              return;
            }
            saveMutation.mutate();
          }}
        >
          {tab === "main" ? (
            <div className="space-y-4">
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
              <div className="grid gap-4 sm:grid-cols-2">
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
                  SKU *
                  <input
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className={cn(fieldClass, "font-mono text-xs")}
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold">
                  Производитель
                  <input
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="block text-xs font-semibold">
                  Страна
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={fieldClass}
                  />
                </label>
              </div>
              <fieldset>
                <legend className="text-xs font-semibold">Категории</legend>
                <div className="mt-2 flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-xl border border-border p-3">
                  {categories.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      Категории не загружены
                    </span>
                  ) : (
                    categories.map((c) => (
                      <label
                        key={c.id}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
                          categoryIds.includes(c.id)
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-border",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={categoryIds.includes(c.id)}
                          onChange={() => toggleCategory(c.id)}
                        />
                        {c.name_ru}
                      </label>
                    ))
                  )}
                </div>
              </fieldset>
              <label className="block text-xs font-semibold">
                Описание
                <textarea
                  value={descriptionRu}
                  onChange={(e) => setDescriptionRu(e.target.value)}
                  className={textareaClass}
                />
              </label>
            </div>
          ) : null}

          {tab === "price" ? (
            <div className="space-y-4">
              <label className="block text-xs font-semibold">
                Наличие
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className={fieldClass}
                >
                  <option value="in_stock">В наличии</option>
                  <option value="on_order">Под заказ</option>
                </select>
              </label>
              <label className="flex items-center gap-3 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={priceOnRequest}
                  onChange={(e) => setPriceOnRequest(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Цена по запросу
              </label>
              {!priceOnRequest ? (
                <label className="block text-xs font-semibold">
                  Цена (KGS)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(e.target.value)}
                    className={fieldClass}
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          {tab === "images" ? (
            <ImagesPanel
              product={existing}
              imageUrls={imageUrls}
              locked={mediaLocked}
              uploading={imageMutation.isPending}
              onUpload={(file) => imageMutation.mutate(file)}
              onDelete={(id) => deleteImageMutation.mutate(id)}
            />
          ) : null}

          {tab === "documents" ? (
            <DocumentsPanel
              product={existing}
              locked={mediaLocked}
              uploading={documentMutation.isPending}
              onUpload={(file) => documentMutation.mutate(file)}
              onDelete={(id) => deleteDocumentMutation.mutate(id)}
            />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            {isEdit ? (
              <Button
                type="button"
                variant="outline"
                className="text-destructive"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (window.confirm("Удалить товар безвозвратно?")) {
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

function ImagesPanel({
  product,
  imageUrls,
  locked,
  uploading,
  onUpload,
  onDelete,
}: {
  product: ProductDetailOut | null;
  imageUrls: Record<string, string>;
  locked: boolean;
  uploading: boolean;
  onUpload: (file: File) => void;
  onDelete: (id: string) => void;
}) {
  const images = product?.images ?? [];
  return (
    <div className="space-y-4">
      {locked ? (
        <p className="text-sm text-muted-foreground">
          Сохраните товар, чтобы загружать изображения.
        </p>
      ) : (
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold">
          <Upload className="h-4 w-4" aria-hidden />
          {uploading ? "Загрузка…" : "Загрузить фото"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onUpload(file);
            }}
          />
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {images.map((img) => (
          <div
            key={img.id}
            className="relative overflow-hidden rounded-2xl border border-border bg-muted"
          >
            {imageUrls[img.id] ? (
              <img
                src={imageUrls[img.id]}
                alt=""
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="grid aspect-square place-items-center">
                <ImagePlus className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-[10px]">
              <span>{img.is_primary ? "Primary" : `sort ${img.sort}`}</span>
              <button
                type="button"
                className="font-semibold text-destructive"
                onClick={() => onDelete(img.id)}
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
      {!locked && images.length === 0 ? (
        <p className="text-sm text-muted-foreground">Пока нет изображений.</p>
      ) : null}
    </div>
  );
}

function DocumentsPanel({
  product,
  locked,
  uploading,
  onUpload,
  onDelete,
}: {
  product: ProductDetailOut | null;
  locked: boolean;
  uploading: boolean;
  onUpload: (file: File) => void;
  onDelete: (id: string) => void;
}) {
  const docs = product?.documents ?? [];
  return (
    <div className="space-y-4">
      {locked ? (
        <p className="text-sm text-muted-foreground">
          Сохраните товар, чтобы загружать документы.
        </p>
      ) : (
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold">
          <Upload className="h-4 w-4" aria-hidden />
          {uploading ? "Загрузка…" : "Загрузить PDF"}
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onUpload(file);
            }}
          />
        </label>
      )}
      <ul className="space-y-2">
        {docs.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm"
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{doc.name}</span>
            </span>
            <button
              type="button"
              className="shrink-0 text-xs font-semibold text-destructive"
              onClick={() => onDelete(doc.id)}
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>
      {!locked && docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Документов пока нет.</p>
      ) : null}
    </div>
  );
}
