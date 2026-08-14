import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  ImagePlus,
  Plus,
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
  setAdminProductPrimaryImage,
  unpublishAdminProduct,
  updateAdminProduct,
  type ProductDetailOut,
} from "@/api/catalog";
import {
  createOptionGroup,
  createProductOption,
  deleteOptionGroup,
  deleteProductOption,
  parseOptionPrice,
  updateOptionGroup,
  updateProductOption,
  OPTION_TYPE_LABEL,
  type OptionType,
} from "@/api/catalog-options";
import { isAppError } from "@/api/errors";
import { fetchMediaDownloadUrl, uploadMediaFile } from "@/api/media";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import {
  DESCRIPTION_PLACEHOLDER,
  DescriptionFormatHint,
  DescriptionPreview,
} from "@/features/admin/DescriptionGuide";
import {
  parsePriceInput,
  productPriceAmount,
} from "@/features/admin/product-price";
import { slugifyCategoryName } from "@/features/catalog/slugify";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Tab = "main" | "price" | "images" | "documents" | "options";

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
    setPriceAmount(productPriceAmount(existing));
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
      const parsedPrice = parsePriceInput(priceAmount, priceOnRequest);
      if (parsedPrice === undefined) {
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
    mutationFn: async (files: File[]) => {
      if (!productId) throw new Error("save first");
      let existingCount = existing?.images?.length ?? 0;
      for (const file of files) {
        const key = await uploadMediaFile("products", file);
        await attachAdminProductImage(productId, {
          s3_key: key,
          is_primary: existingCount === 0,
        });
        existingCount += 1;
      }
      return files.length;
    },
    onSuccess: async (count) => {
      await invalidateAll();
      if (productId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.catalog.adminProduct(productId),
        });
      }
      toast.success(
        count === 1 ? "Изображение добавлено" : `Добавлено фото: ${count}`,
      );
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

  /*
   * Смена обложки. До появления ручки в API у изображения было одно
   * действие — «Удалить», и чтобы поменять главное фото, картинку удаляли
   * и загружали заново: при загрузке is_primary ставится первой.
   */
  const primaryImageMutation = useMutation({
    mutationFn: (imageId: string) =>
      setAdminProductPrimaryImage(productId!, imageId),
    onSuccess: async () => {
      await invalidateAll();
      if (productId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.catalog.adminProduct(productId),
        });
      }
      toast.success("Главное изображение изменено");
    },
    onError: (err) => {
      toast.error(
        isAppError(err) ? err.message : "Не удалось сменить главное фото",
      );
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
      ["options", "Комплектация"],
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
                  ? "bg-success-soft text-success-strong"
                  : "bg-warning-soft text-warning-strong",
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
                  className="field-control mt-1.5"
                />
              </label>
              <label className="block text-xs font-semibold">
                Название (EN)
                <input
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="field-control mt-1.5"
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
                    className={cn("field-control mt-1.5", "font-mono text-xs")}
                  />
                </label>
                <label className="block text-xs font-semibold">
                  SKU *
                  <input
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className={cn("field-control mt-1.5", "font-mono text-xs")}
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold">
                  Производитель
                  <input
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    className="field-control mt-1.5"
                  />
                </label>
                <label className="block text-xs font-semibold">
                  Страна
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="field-control mt-1.5"
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
                  className="field-control mt-1.5 min-h-[220px] py-2 font-mono text-xs leading-6"
                  placeholder={DESCRIPTION_PLACEHOLDER}
                />
              </label>
              <DescriptionFormatHint />
              <DescriptionPreview text={descriptionRu} />
            </div>
          ) : null}

          {tab === "price" ? (
            <div className="space-y-4">
              <label className="block text-xs font-semibold">
                Наличие
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="field-control mt-1.5"
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
                    className="field-control mt-1.5"
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          {tab === "options" ? (
            <OptionsPanel
              productId={productId}
              product={existing}
              onChanged={(updated) => {
                if (!productId) return;
                queryClient.setQueryData(
                  queryKeys.catalog.adminProduct(productId),
                  updated,
                );
              }}
              onInvalidate={() => {
                if (!productId) return;
                void queryClient.invalidateQueries({
                  queryKey: queryKeys.catalog.adminProduct(productId),
                });
              }}
            />
          ) : null}

          {tab === "images" ? (
            <ImagesPanel
              product={existing}
              imageUrls={imageUrls}
              locked={mediaLocked}
              uploading={imageMutation.isPending}
              onUpload={(files) => imageMutation.mutate(files)}
              onDelete={(id) => deleteImageMutation.mutate(id)}
              onMakePrimary={(id) => primaryImageMutation.mutate(id)}
              primaryPending={primaryImageMutation.isPending}
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

/**
 * Конфигуратор комплектаций (ТЗ п. 10.1: «варианты, дополнения, аксессуары
 * на товар»).
 *
 * Каждая операция возвращает карточку товара целиком, поэтому кэш обновляется
 * ответом мутации — без лишнего перезапроса.
 *
 * Все кнопки здесь `type="button"`: панель живёт внутри формы товара, и кнопка
 * по умолчанию отправила бы её.
 */
function OptionsPanel({
  productId,
  product,
  onChanged,
  onInvalidate,
}: {
  productId?: string;
  product: ProductDetailOut | null;
  onChanged: (updated: ProductDetailOut) => void;
  onInvalidate: () => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [renaming, setRenaming] = useState<Record<string, string>>({});

  const groups = product?.option_groups ?? [];

  const addGroup = useMutation({
    mutationFn: () =>
      createOptionGroup(productId!, { name_ru: groupName.trim() }),
    onSuccess: (updated) => {
      setGroupName("");
      onChanged(updated);
      toast.success("Группа добавлена");
    },
    onError: (err) =>
      toast.error(isAppError(err) ? err.message : "Не удалось добавить группу"),
  });

  const renameGroup = useMutation({
    mutationFn: ({ groupId, name }: { groupId: string; name: string }) =>
      updateOptionGroup(productId!, groupId, { name_ru: name }),
    onSuccess: (updated, { groupId }) => {
      setRenaming((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      onChanged(updated);
      toast.success("Группа переименована");
    },
    onError: (err) =>
      toast.error(isAppError(err) ? err.message : "Не удалось переименовать"),
  });

  const removeGroup = useMutation({
    mutationFn: (groupId: string) => deleteOptionGroup(productId!, groupId),
    onSuccess: () => {
      onInvalidate();
      toast.success("Группа удалена");
    },
    onError: (err) =>
      toast.error(isAppError(err) ? err.message : "Не удалось удалить группу"),
  });

  const toggleOption = useMutation({
    mutationFn: ({
      groupId,
      optionId,
      isActive,
    }: {
      groupId: string;
      optionId: string;
      isActive: boolean;
    }) =>
      updateProductOption(productId!, groupId, optionId, {
        is_active: isActive,
      }),
    onSuccess: onChanged,
    onError: (err) =>
      toast.error(isAppError(err) ? err.message : "Не удалось изменить опцию"),
  });

  const removeOption = useMutation({
    mutationFn: ({
      groupId,
      optionId,
    }: {
      groupId: string;
      optionId: string;
    }) => deleteProductOption(productId!, groupId, optionId),
    onSuccess: () => {
      onInvalidate();
      toast.success("Опция удалена");
    },
    onError: (err) =>
      toast.error(isAppError(err) ? err.message : "Не удалось удалить опцию"),
  });

  if (!productId) {
    return (
      <p className="text-sm text-muted-foreground">
        Сохраните товар, чтобы настроить комплектацию.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
        Группа — это один выбор на карточке товара: «Комплектация», «Гарантия»,
        «Пусконаладка». Внутри группы <b>вариант</b> выбирается один (radio), а
        дополнения, аксессуары и услуги — флажками. Опция без цены считается «по
        запросу» и переводит всю сделку в запрос КП, даже если клиент
        верифицирован.
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[220px] flex-1 text-xs font-semibold">
          Новая группа
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Гарантия"
            className="field-control mt-1.5"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={!groupName.trim() || addGroup.isPending}
          onClick={() => addGroup.mutate()}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Добавить
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Комплектаций нет — товар продаётся как есть.
        </p>
      ) : null}

      {groups.map((group) => (
        <section
          key={group.id}
          className="space-y-3 rounded-2xl border border-border p-4"
        >
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[200px] flex-1 text-xs font-semibold">
              Название группы
              <input
                value={renaming[group.id] ?? group.name_ru}
                onChange={(e) =>
                  setRenaming((prev) => ({
                    ...prev,
                    [group.id]: e.target.value,
                  }))
                }
                className="field-control mt-1.5"
              />
            </label>
            {renaming[group.id] !== undefined &&
            renaming[group.id] !== group.name_ru ? (
              <Button
                type="button"
                variant="outline"
                disabled={renameGroup.isPending}
                onClick={() =>
                  renameGroup.mutate({
                    groupId: group.id,
                    name: renaming[group.id].trim(),
                  })
                }
              >
                Сохранить
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              disabled={removeGroup.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Удалить группу «${group.name_ru}» вместе со всеми опциями?`,
                  )
                ) {
                  removeGroup.mutate(group.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          <ul className="divide-y divide-border">
            {group.options.map((option) => (
              <li
                key={option.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      !option.is_active && "text-muted-foreground line-through",
                    )}
                  >
                    {option.name_ru}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {OPTION_TYPE_LABEL[option.option_type as OptionType] ??
                      option.option_type}
                    {" · "}
                    {formatMoney(option.price, "цена по запросу")}
                    {option.is_required ? " · обязательная" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={toggleOption.isPending}
                    onClick={() =>
                      toggleOption.mutate({
                        groupId: group.id,
                        optionId: option.id,
                        isActive: !option.is_active,
                      })
                    }
                  >
                    {option.is_active ? "Скрыть" : "Вернуть"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    disabled={removeOption.isPending}
                    onClick={() => {
                      if (
                        window.confirm(`Удалить опцию «${option.name_ru}»?`)
                      ) {
                        removeOption.mutate({
                          groupId: group.id,
                          optionId: option.id,
                        });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <NewOptionForm
            productId={productId}
            groupId={group.id}
            onCreated={onChanged}
          />
        </section>
      ))}
    </div>
  );
}

function NewOptionForm({
  productId,
  groupId,
  onCreated,
}: {
  productId: string;
  groupId: string;
  onCreated: (updated: ProductDetailOut) => void;
}) {
  const [name, setName] = useState("");
  const [optionType, setOptionType] = useState<OptionType>("addon");
  const [price, setPrice] = useState("");
  const [required, setRequired] = useState(false);

  const parsedPrice = parseOptionPrice(price);

  const create = useMutation({
    mutationFn: () =>
      createProductOption(productId, groupId, {
        name_ru: name.trim(),
        option_type: optionType,
        // Пустая цена — это «по запросу», а не ноль.
        price_amount: parsedPrice ?? null,
        is_required: required,
      }),
    onSuccess: (updated) => {
      setName("");
      setPrice("");
      setRequired(false);
      onCreated(updated);
      toast.success("Опция добавлена");
    },
    onError: (err) =>
      toast.error(isAppError(err) ? err.message : "Не удалось добавить опцию"),
  });

  const priceInvalid = parsedPrice === undefined;

  return (
    <div className="grid gap-2 rounded-xl bg-muted/40 p-3 sm:grid-cols-[2fr_1.4fr_1fr_auto]">
      <label className="text-[11px] font-semibold">
        Название
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="+1 год гарантии"
          className="field-control mt-1.5"
        />
      </label>
      <label className="text-[11px] font-semibold">
        Тип
        <select
          value={optionType}
          onChange={(e) => setOptionType(e.target.value as OptionType)}
          className="field-control mt-1.5"
        >
          {Object.entries(OPTION_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-[11px] font-semibold">
        Цена, KGS
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="по запросу"
          inputMode="decimal"
          className="field-control mt-1.5"
        />
      </label>
      <div className="flex items-end gap-2">
        <label className="inline-flex items-center gap-1.5 pb-3 text-[11px] font-semibold">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Обяз.
        </label>
        <Button
          type="button"
          variant="outline"
          className="mb-1"
          disabled={!name.trim() || priceInvalid || create.isPending}
          onClick={() => create.mutate()}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </Button>
      </div>
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
  onMakePrimary,
  primaryPending,
}: {
  product: ProductDetailOut | null;
  imageUrls: Record<string, string>;
  locked: boolean;
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onDelete: (id: string) => void;
  onMakePrimary: (id: string) => void;
  primaryPending: boolean;
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
            multiple
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length) onUpload(files);
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
              {/* Было «Primary» / «sort 2» — английские служебные подписи
                  в русской админке, которой пользуются сотрудники заказчика.
                  Тот же дефект, что «Pub»/«Draft» в списке товаров. */}
              <span
                className={img.is_primary ? "font-semibold text-primary" : ""}
              >
                {img.is_primary ? "Главное" : `Порядок ${img.sort}`}
              </span>
              <span className="flex items-center gap-2">
                {/* У главного изображения кнопки нет: нажимать её незачем,
                    а её присутствие заставляло бы сверять подпись слева. */}
                {!locked && !img.is_primary ? (
                  <button
                    type="button"
                    className="font-semibold text-primary disabled:opacity-60"
                    disabled={primaryPending}
                    onClick={() => onMakePrimary(img.id)}
                  >
                    Сделать главным
                  </button>
                ) : null}
                <button
                  type="button"
                  className="font-semibold text-destructive"
                  onClick={() => onDelete(img.id)}
                >
                  Удалить
                </button>
              </span>
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
