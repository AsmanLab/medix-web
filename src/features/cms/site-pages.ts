/**
 * Реестр CMS-страниц с собственным URL на витрине ("about" → /about и т.д.),
 * в отличие от произвольных страниц, которые открываются через /pages/:slug.
 *
 * Единственное место, где строка "about"/"service" зашита как slug — витрина
 * (about.tsx, service/index.tsx) и админка (список страниц, редактор) читают
 * его отсюда, чтобы не разойтись.
 *
 * /legal/* сюда не входит: те тексты намеренно захардкожены
 * (features/legal/documents.ts) как стабильные URL для App Store/Play Console
 * и от CMS не зависят.
 */
export type SitePage = {
  slug: string;
  title: string;
  path: string;
  hint: string;
};

export const SITE_PAGES: readonly SitePage[] = [
  { slug: "about", title: "О компании", path: "/about", hint: "Открывается по кнопке «О компании» в шапке и подвале сайта" },
  { slug: "service", title: "Сервис", path: "/service", hint: "Текст под формой заявки на сервис" },
];

export function findSitePage(slug: string): SitePage | undefined {
  return SITE_PAGES.find((page) => page.slug === slug);
}

/**
 * Слуги, у которых уже есть свой захардкоженный пункт навигации — чтобы
 * автоссылка на произвольную CMS-страницу (`navPagesFrom`) не продублировала
 * «О компании»/«Сервис» (SITE_PAGES) и юридические страницы
 * (`/legal/*`, см. features/legal/documents.ts — слуги которых не совпадают
 * с CMS, но на случай, если заказчик создаст страницу с таким же названием,
 * фильтруем по строковым slug'ам, под которыми их можно было бы завести).
 */
const RESERVED_NAV_SLUGS = new Set([
  ...SITE_PAGES.map((p) => p.slug),
  "privacy",
  "terms",
]);

/**
 * Из списка опубликованных CMS-страниц (`GET /cms/pages`) оставляет те, для
 * которых в подвале/меню ещё нет своей ссылки — такие страницы иначе
 * открываются только по прямому URL `/pages/:slug` (medix-core#CMS: новая
 * страница нигде не отображается после публикации).
 */
export function navPagesFrom<T extends { slug: string }>(pages: T[]): T[] {
  return pages.filter((page) => !RESERVED_NAV_SLUGS.has(page.slug));
}
