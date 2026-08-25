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
