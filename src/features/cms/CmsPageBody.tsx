import { useMemo } from "react";
import { PageBlocks } from "@/features/cms/blocks/PageBlocks";
import { hasBlocks, parsePageContent } from "@/features/cms/blocks/schema";
import { CmsHtml } from "@/features/cms/CmsHtml";

type CmsPageBodyProps = {
  bodyHtml: string;
  contentJson: unknown;
  className?: string;
};

/**
 * Общий переключатель "блоки vs старый HTML" для всех потребителей
 * `body_html`/`content_json` (about.tsx, pages/$slug.tsx, service/index.tsx),
 * чтобы условие не размножалось по каждому роуту отдельно.
 */
export function CmsPageBody({ bodyHtml, contentJson, className }: CmsPageBodyProps) {
  const blocks = useMemo(() => parsePageContent(contentJson), [contentJson]);
  if (hasBlocks(blocks)) return <PageBlocks blocks={blocks} className={className} />;
  return <CmsHtml html={bodyHtml} className={className} />;
}

/**
 * Есть ли вообще что показать — заменяет прежнюю проверку `body_html.trim()`
 * там, где секция целиком скрывается при пустой странице (service/index.tsx).
 * Без блоков в проверке страница, собранная в конструкторе, но с пустым
 * `body_html` (fallback не понадобился), считалась бы пустой.
 */
export function hasCmsContent(page: { body_html: string; content_json: unknown } | undefined): boolean {
  if (!page) return false;
  if (hasBlocks(parsePageContent(page.content_json))) return true;
  return page.body_html.trim().length > 0;
}
