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
  type CategoryTranslationsBody,
} from "@/api/catalog";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import {
  buildAdminCategoryTree,
  collectCategoryIds,
  findCategoryNode,
  flattenCategoryTree,
  subtreeHeight,
  MAX_CATEGORY_DEPTH,
} from "@/features/catalog/map-category";
import { LanguageTabs } from "@/features/admin/LanguageTabs";
import { slugifyCategoryName } from "@/features/catalog/slugify";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

/** Тексты категории на одном языке. */
type CategoryText = { name: string; seo_title: string; seo_description: string };
type CategoryTexts = Record<Locale, CategoryText>;

function emptyTexts(): CategoryTexts {
  return Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      { name: "", seo_title: "", seo_description: "" },
    ]),
  ) as CategoryTexts;
}

/**
 * Ответ API в состояние формы.
 *
 * Берём `translations`, а не `name_ru`/`name_en`: в словаре есть языки,
 * у которых плоского поля нет. На старом бэкенде словаря не будет —
 * тогда работают плоские поля, и форма остаётся рабочей.
 */
function textsFromApi(category: CategoryOut): CategoryTexts {
  const result = emptyTexts();
  for (const locale of LOCALES) {
    const row = category.translations?.[locale];
    if (row) {
      result[locale] = {
        name: row.name ?? "",
        seo_title: row.seo_title ?? "",
        seo_description: row.seo_description ?? "",
      };
    }
  }
  if (!category.translations) {
    result.ru = {
      name: category.name_ru,
      seo_title: category.seo_title ?? "",
      seo_description: category.seo_description ?? "",
    };
    result.en = { ...result.en, name: category.name_en ?? "" };
  }
  return result;
}

/**
 * Состояние формы в тело запроса.
 *
 * Отправляются **все** языки, включая опустевшие: пустой перевод — это
 * команда «удалить», и сервер сам выбросит такую строку. Пропустить
 * язык означало бы «не трогать», и стереть перевод стало бы нечем.
 */
function translationsBody(texts: CategoryTexts): CategoryTranslationsBody {
  return Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      {
        name: texts[locale].name.trim(),
        seo_title: texts[locale].seo_title.trim(),
        seo_description: texts[locale].seo_description.trim(),
      },
    ]),
  );
}

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

  /**
   * Тексты по языкам — один объект вместо отдельных состояний на поле.
   *
   * Иначе с тремя языками и тремя полями это девять `useState`, и каждый
   * новый язык добавлял бы ещё три.
   */
  const [texts, setTexts] = useState<CategoryTexts>(emptyTexts);
  const [lang, setLang] = useState<Locale>(DEFAULT_LOCALE);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [parentId, setParentId] = useState("");
  const [imageKey, setImageKey] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sort, setSort] = useState(0);

  useEffect(() => {
    if (!existing) return;
    setTexts(textsFromApi(existing));
    setSlug(existing.slug);
    setSlugTouched(true);
    setParentId(existing.parent_id ?? "");
    setImageKey(existing.image_key ?? "");
    setIsActive(existing.is_active);
    setSort(existing.sort);
  }, [existing]);

  const nameRu = texts.ru.name;

  function setField(field: keyof CategoryText, value: string) {
    setTexts((prev) => ({ ...prev, [lang]: { ...prev[lang], [field]: value } }));
  }

  /** Языки, у которых хоть что-то введено, — для точек на вкладках. */
  const filled = useMemo(
    () =>
      new Set(
        LOCALES.filter((locale) =>
          Object.values(texts[locale]).some((v) => v.trim()),
        ),
      ),
    [texts],
  );

  /**
   * Кого можно назначить родителем.
   *
   * Прежде это был плоский список всех категорий: в нём нельзя было понять,
   * где какая лежит, и ничто не мешало выбрать родителем **собственную
   * подкатегорию**. Такая ветка не «ломается» громко — она просто исчезает
   * с витрины, потому что обход дерева идёт от корней и в кольцо не заходит.
   *
   * Отсеиваются три группы, и все три бэкенд теперь отбивает с 422 — здесь
   * они убраны из списка, чтобы человек не натыкался на отказ после
   * сохранения:
   *
   * - сама категория;
   * - её потомки (кольцо);
   * - те, под кем ветка не поместится в три уровня. Считается высота самой
   *   ветки, а не только уровень родителя: раздел с подкатегориями встаёт
   *   на третий уровень «нормально», а его дети оказываются четвёртым.
   */
  const parentOptions = useMemo(() => {
    const tree = buildAdminCategoryTree(listQuery.data ?? []);
    const rows = flattenCategoryTree(tree);
    if (!categoryId) {
      // Новая категория — лист: под неё нужен хотя бы один свободный
      // уровень у родителя.
      return rows.filter((c) => c.depth < MAX_CATEGORY_DEPTH);
    }

    const self = findCategoryNode(tree, categoryId);
    if (!self) return rows;

    const forbidden = new Set(collectCategoryIds(self));
    const height = subtreeHeight(self);
    return rows.filter(
      (c) => !forbidden.has(c.id) && c.depth + height <= MAX_CATEGORY_DEPTH,
    );
  }, [listQuery.data, categoryId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        // Плоские поля — ради уже написанных клиентов (мобильное
        // приложение читает `name_ru`/`name_en` с первого дня). Словарь
        // `translations` несёт то же самое плюс языки без своих полей.
        name_ru: texts.ru.name.trim(),
        name_en: texts.en.name.trim(),
        seo_title: texts.ru.seo_title.trim(),
        seo_description: texts.ru.seo_description.trim(),
        translations: translationsBody(texts),
        slug: slug.trim(),
        parent_id: parentId || null,
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
    setField("name", value);
    // Slug подставляется только из русского названия: адрес страницы
    // один на все языки, и собирать его из кыргызского имени значило бы
    // менять адрес при заполнении перевода.
    if (lang === DEFAULT_LOCALE && !slugTouched) {
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
          Название и SEO по языкам, slug и место в дереве
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
          {/*
           * Тексты по языкам. Русский обязателен и служит откатом:
           * непереведённая категория покажется на витрине по-русски,
           * а не пустой строкой.
           */}
          <LanguageTabs active={lang} onChange={setLang} filled={filled}>
            <label className="block text-xs font-semibold">
              {lang === DEFAULT_LOCALE ? "Название *" : "Название"}
              <input
                required={lang === DEFAULT_LOCALE}
                value={texts[lang].name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder={
                  lang === DEFAULT_LOCALE ? undefined : texts.ru.name
                }
                className="field-control mt-1.5"
              />
              {lang !== DEFAULT_LOCALE ? (
                <span className="mt-1.5 block font-normal text-muted-foreground">
                  Пусто — на витрине покажется русское название.
                </span>
              ) : null}
            </label>

            <label className="block text-xs font-semibold">
              SEO title
              <input
                value={texts[lang].seo_title}
                onChange={(e) => setField("seo_title", e.target.value)}
                className="field-control mt-1.5"
              />
            </label>

            <label className="block text-xs font-semibold">
              SEO description
              <textarea
                value={texts[lang].seo_description}
                onChange={(e) => setField("seo_description", e.target.value)}
                className="field-control mt-1.5 min-h-[88px] py-2"
              />
            </label>
          </LanguageTabs>

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
            Родительская категория
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="field-control mt-1.5"
            >
              <option value="">Корневая категория</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {/*
                   * Неразрывные пробелы, а не отступ стилями: содержимое
                   * <option> браузеры оформляют по-своему, и обычные
                   * пробелы в начале схлопываются. Без отступа список
                   * из трёх уровней читается как каша.
                   */}
                  {"  ".repeat(c.depth - 1)}
                  {c.depth > 1 ? "└ " : ""}
                  {c.name} ({c.slug})
                </option>
              ))}
            </select>
            <span className="mt-1.5 block font-normal text-muted-foreground">
              Дерево ограничено {MAX_CATEGORY_DEPTH} уровнями — например,
              «Лаборатория → Гематология → Гематологические анализаторы».
              Категории, под которыми эта ветка не поместится, а также её
              собственные подкатегории в списке не показаны.
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold">
              Порядок (sort)
              <input
                type="number"
                value={sort}
                onChange={(e) => setSort(Number(e.target.value) || 0)}
                className="field-control mt-1.5"
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
              className={cn("field-control mt-1.5", "font-mono text-xs")}
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
