import { useEffect } from "react";
import { useT } from "@/i18n/LocaleProvider";

const SITE_NAME = "Medix International";

/** Описание по умолчанию — то же, что в index.html, чтобы не расходились. */
const DEFAULT_DESCRIPTION =
  "Медицинское оборудование, расходные материалы и сервис для клиник Кыргызстана. Каталог, RFQ и заказы — Medix International.";

/** Находит <meta> по паре атрибут/значение или создаёт его. */
function setMeta(key: "name" | "property", value: string, content: string) {
  const selector = `meta[${key}="${value}"]`;
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(key, value);
    document.head.append(tag);
  }
  tag.setAttribute("content", content);
}

export type PageMeta = {
  /** Заголовок страницы без названия сайта — оно добавляется само. */
  title?: string | null;
  description?: string | null;
};

/**
 * Заголовок вкладки и описание страницы.
 *
 * `document.title` не выставлялся нигде: все страницы SPA назывались «Medix»,
 * поэтому вкладки, история и закладки были неразличимы, а в выдаче поиска
 * каталог, товар и контакты выглядели одной страницей.
 *
 * Отдельная беда — `seo_title` и `seo_description`: их заполняют в админке
 * для CMS-страниц и категорий, но в разметку они не попадали никогда,
 * то есть заказчик тратил время на поля, которые ничего не делают.
 *
 * Заголовок ставится эффектом, а не через <head> на сервере: рендеринг
 * клиентский, поисковики со скриптом это видят, а для полноценного SSR
 * нужна другая архитектура — она за рамками договора.
 */
export function usePageMeta({ title, description }: PageMeta) {
  const t = useT();
  useEffect(() => {
    const previousTitle = document.title;

    document.title = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
    const text = description?.trim() || t(DEFAULT_DESCRIPTION);
    setMeta("name", "description", text);
    setMeta("property", "og:title", document.title);
    setMeta("property", "og:description", text);

    return () => {
      document.title = previousTitle;
    };
  }, [title, description, t]);
}
