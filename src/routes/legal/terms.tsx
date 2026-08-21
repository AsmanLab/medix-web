import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shared/AppShell";
import { LegalDocument } from "@/features/legal/LegalDocument";
import { TERMS_OF_USE } from "@/features/legal/documents";
import { usePageMeta } from "@/lib/page-meta";
import { useT } from "@/i18n/LocaleProvider";

export const Route = createFileRoute("/legal/terms")({
  component: TermsOfUsePage,
});

/** Публичный URL условий пользования (Terms of Use / EULA) для сторов. */
function TermsOfUsePage() {
  const t = useT();
  usePageMeta({
    title: t("Условия пользования"),
    description: t("Правила использования платформы Medix."),
  });

  return (
    <AppShell>
      <LegalDocument doc={TERMS_OF_USE} />
    </AppShell>
  );
}
