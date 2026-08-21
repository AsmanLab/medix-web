import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/shared/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { LegalDocument } from "@/features/legal/LegalDocument";
import { ACCOUNT_DELETION } from "@/features/legal/documents";
import { usePageMeta } from "@/lib/page-meta";
import { useT } from "@/i18n/LocaleProvider";

export const Route = createFileRoute("/legal/account-deletion")({
  component: AccountDeletionPage,
});

/**
 * Публичный URL с инструкцией по удалению аккаунта. Google требует его
 * отдельно от политики конфиденциальности (Data safety → Data deletion URL),
 * Apple — как часть 5.1.1(v). Должен открываться без входа в аккаунт.
 */
function AccountDeletionPage() {
  const t = useT();
  usePageMeta({
    title: t("Как удалить аккаунт"),
    description: t("Как удалить аккаунт Medix и что при этом происходит с данными."),
  });

  return (
    <AppShell>
      <LegalDocument doc={ACCOUNT_DELETION} />
      <div className="mt-6">
        <Link to="/profile/delete" className={buttonVariants({ variant: "destructive" })}>
          {t("Удалить аккаунт сейчас")}
        </Link>
      </div>
    </AppShell>
  );
}
