import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ExternalLink, Save, Trash2, Wand2 } from "lucide-react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { slugifyCategoryName } from "@/features/catalog/slugify";
import { BlockListEditor } from "@/features/admin/cms-blocks/BlockListEditor";
import { blocksToHtml } from "@/features/cms/blocks/to-html";
import { htmlToBlocks } from "@/features/cms/blocks/from-html";
import { hasBlocks, parsePageContent, type Block } from "@/features/cms/blocks/schema";
import { PageBlocks } from "@/features/cms/blocks/PageBlocks";
import { CmsHtml } from "@/features/cms/CmsHtml";
import { findSitePage } from "@/features/cms/site-pages";

type Props = { slug?: string; prefillSlug?: string };

const SLUG_PATTERN = /^[a-z0-9-]+$/;

export function CmsPageEditor({ slug, prefillSlug }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(slug);
  const knownPage = findSitePage(slug ?? prefillSlug ?? "");

  const detailQuery = useQuery({
    queryKey: queryKeys.cms.adminPage(slug ?? ""),
    queryFn: ({ signal }) => fetchAdminCmsPage(slug!, signal),
    enabled: isEdit,
  });

  const [title, setTitle] = useState(knownPage?.title ?? "");
  const [pageSlug, setPageSlug] = useState(knownPage?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(knownPage));
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [status, setStatus] = useState("draft");

  // "blocks" — редактируем конструктором; "html" — старая страница, блоков
  // ещё нет, показываем плашку с предложением пересобрать вместо того, чтобы
  // молча подменить содержимое.
  const [mode, setMode] = useState<"blocks" | "html">("blocks");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [legacyHtml, setLegacyHtml] = useState("");
  const [reconstructPreview, setReconstructPreview] = useState<Block[] | null>(null);
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");

  useEffect(() => {
    const page = detailQuery.data;
    if (!page) return;
    setTitle(page.title);
    setPageSlug(page.slug);
    setSlugTouched(true);
    setSeoTitle(page.seo_title);
    setSeoDescription(page.seo_description);
    setStatus(page.status);
    setLegacyHtml(page.body_html);

    const parsed = parsePageContent(page.content_json);
    if (parsed) {
      setBlocks(parsed);
      setMode("blocks");
    } else {
      setBlocks([]);
      setMode(page.body_html.trim() ? "html" : "blocks");
    }
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
      if (!knownPage && !SLUG_PATTERN.test(pageSlug.trim())) {
        throw Object.assign(new Error("Адрес страницы: латиница, цифры, дефис"), {
          status: 400,
          message: "Адрес страницы: латиница, цифры, дефис",
        });
      }

      const bodyHtml = mode === "blocks" ? blocksToHtml(blocks) : legacyHtml;
      // content_json шлём, только если реально работаем в конструкторе —
      // иначе PATCH со старой HTML-страницей молча перевёл бы её в режим
      // блоков с пустым списком и стёр бы то, что видно на сайте сейчас.
      const contentJson = mode === "blocks" ? blocks : undefined;

      if (isEdit && slug) {
        return updateAdminCmsPage(slug, {
          title: title.trim(),
          body_html: bodyHtml,
          content_json: contentJson,
          seo_title: seoTitle.trim(),
          seo_description: seoDescription.trim(),
          status,
        });
      }
      return createAdminCmsPage({
        slug: pageSlug.trim(),
        title: title.trim(),
        body_html: bodyHtml,
        content_json: contentJson ?? [],
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

  const previewBlocks = mode === "blocks" ? blocks : null;

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
            {status === "published" ? "Сохранить и опубликовать" : "Сохранить"}
          </Button>
        </div>
      </div>

      <StateBlock
        isLoading={isEdit && detailQuery.isLoading}
        isError={isEdit && detailQuery.isError}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-bold">
              {knownPage ? knownPage.title : isEdit ? "Редактирование страницы" : "Новая страница"}
            </h1>
            {knownPage ? (
              <a
                href={knownPage.path}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
              >
                Открыть на сайте
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : null}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* ── Редактор ─────────────────────────────────────────────── */}
            <div className={mobileTab === "editor" ? "space-y-4" : "hidden space-y-4 xl:block"}>
              <label className="block text-xs font-semibold">
                Заголовок
                <input
                  value={title}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTitle(value);
                    if (!slugTouched && !isEdit && !knownPage) {
                      setPageSlug(slugifyCategoryName(value));
                    }
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
                  <option value="draft">Черновик — не виден на сайте</option>
                  <option value="published">Опубликовано</option>
                </select>
              </label>

              {mode === "html" ? (
                <div className="space-y-3 rounded-2xl border border-warning-strong/30 bg-warning-soft p-4">
                  <div className="flex items-start gap-2 text-sm font-semibold text-warning-strong">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    Эта страница сделана старым способом, без конструктора.
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Чтобы вводить текст и фото так же, как в новых страницах, разберите
                    её на блоки. Результат можно проверить перед сохранением.
                  </p>
                  {reconstructPreview ? (
                    <div className="space-y-3 rounded-xl border border-border bg-background p-3">
                      <p className="text-xs font-semibold">Так получится в блоках:</p>
                      {reconstructPreview.length > 0 ? (
                        <PageBlocks blocks={reconstructPreview} />
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Ничего не удалось распознать — начните с чистого листа.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            setBlocks(reconstructPreview);
                            setMode("blocks");
                            setReconstructPreview(null);
                          }}
                        >
                          Сохранить как блоки
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setReconstructPreview(null)}
                        >
                          Отменить
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setReconstructPreview(htmlToBlocks(legacyHtml))}
                    >
                      <Wand2 className="h-4 w-4" aria-hidden />
                      Пересобрать в блоках
                    </Button>
                  )}
                </div>
              ) : (
                <BlockListEditor blocks={blocks} onChange={setBlocks} />
              )}

              <Accordion type="single" collapsible>
                <AccordionItem value="advanced">
                  <AccordionTrigger>Дополнительно</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    {knownPage ? (
                      <p className="text-xs text-muted-foreground">
                        Адрес на сайте: <span className="font-mono">{knownPage.path}</span>. Менять
                        его не нужно.
                      </p>
                    ) : (
                      <label className="block text-xs font-semibold">
                        Адрес страницы
                        <input
                          value={pageSlug}
                          disabled={isEdit}
                          onChange={(e) => {
                            setSlugTouched(true);
                            setPageSlug(e.target.value);
                          }}
                          className="field-control mt-1.5 font-mono"
                        />
                        <span className="mt-1 block text-xs font-normal text-muted-foreground">
                          Латиницей, без пробелов. Страница откроется по адресу{" "}
                          {typeof window !== "undefined" ? window.location.origin : ""}
                          /pages/{pageSlug || "…"}
                          {isEdit ? " — после создания не меняется." : "."}
                        </span>
                      </label>
                    )}

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
                        className="field-control mt-1.5 min-h-[88px] py-2"
                      />
                    </label>

                    {mode === "blocks" && legacyHtml.trim() ? (
                      <details className="rounded-xl border border-border p-3">
                        <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                          Исходный HTML (только для чтения — заменён блоками)
                        </summary>
                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                          {legacyHtml}
                        </pre>
                      </details>
                    ) : null}

                    {mode === "html" ? (
                      <label className="block text-xs font-semibold">
                        Режим HTML (для разработчика)
                        <textarea
                          value={legacyHtml}
                          onChange={(e) => setLegacyHtml(e.target.value)}
                          className="field-control mt-1.5 min-h-[160px] py-2 font-mono"
                        />
                      </label>
                    ) : null}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* ── Превью ───────────────────────────────────────────────── */}
            <div
              className={mobileTab === "preview" ? "space-y-3" : "hidden space-y-3 xl:block"}
            >
              <div className="flex gap-2 xl:hidden">
                <button
                  type="button"
                  onClick={() => setMobileTab("editor")}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold data-[active=true]:border-primary data-[active=true]:text-primary"
                  data-active={mobileTab === "editor"}
                >
                  Редактор
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab("preview")}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold data-[active=true]:border-primary data-[active=true]:text-primary"
                  data-active={mobileTab === "preview"}
                >
                  Как будет на сайте
                </button>
              </div>
              <p className="hidden text-xs font-semibold text-muted-foreground xl:block">
                Как увидит посетитель сайта
              </p>
              <div className="xl:sticky xl:top-4 rounded-3xl border border-border bg-card p-5 sm:p-8">
                <h1 className="font-display text-3xl font-bold">
                  {title || "Заголовок страницы"}
                </h1>
                <div className="mt-6">
                  {hasBlocks(previewBlocks) ? (
                    <PageBlocks blocks={previewBlocks} />
                  ) : (
                    <CmsHtml html={mode === "html" ? legacyHtml : ""} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </StateBlock>
    </div>
  );
}
