import type { LegalDoc } from "@/features/legal/documents";
import { useT } from "@/i18n/LocaleProvider";

/**
 * Рендер структурированного юридического документа (политика, условия,
 * инструкция по удалению аккаунта). Типографика скопирована с `CmsHtml`,
 * чтобы страницы `/legal/*` не выбивались из остальной витрины.
 */
export function LegalDocument({ doc }: { doc: LegalDoc }) {
  const t = useT();
  return (
    <article>
      <h1 className="font-display text-3xl font-bold">{doc.title}</h1>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("Обновлено: {date}", { date: doc.updatedAt })}
      </p>
      <div className="mt-6 space-y-6 rounded-3xl border border-border bg-card p-5 text-sm leading-7 text-foreground sm:p-8">
        {doc.intro.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {doc.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="font-display text-xl font-bold">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.list ? (
              <ul className="list-disc space-y-1.5 pl-5">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  );
}
