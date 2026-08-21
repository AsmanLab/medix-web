import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shared/AppShell";
import { LegalDocument } from "@/features/legal/LegalDocument";
import { PRIVACY_POLICY } from "@/features/legal/documents";
import { usePageMeta } from "@/lib/page-meta";
import { useT } from "@/i18n/LocaleProvider";

export const Route = createFileRoute("/legal/privacy")({
  component: PrivacyPolicyPage,
});

/**
 * Публичный URL политики конфиденциальности. Нужен как Privacy Policy URL
 * в App Store Connect и Play Console — хардкод, а не CMS: адрес должен
 * работать вне зависимости от того, заполнил ли заказчик CMS-страницу.
 */
function PrivacyPolicyPage() {
  const t = useT();
  usePageMeta({
    title: t("Политика конфиденциальности"),
    description: t(
      "Как Medix собирает, использует и хранит персональные данные пользователей платформы.",
    ),
  });

  return (
    <AppShell>
      <LegalDocument doc={PRIVACY_POLICY} />
    </AppShell>
  );
}
