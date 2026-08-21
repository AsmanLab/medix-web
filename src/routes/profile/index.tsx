import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ChevronRight,
  KeyRound,
  LogOut,
  Package,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { fetchProfile } from "@/api/profile";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { getAppQueryClient } from "@/app/providers";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import {
  clientTypeLabel,
  isVerified,
  profileInitials,
  verificationBanner,
  verificationLabel,
} from "@/features/profile/labels";
import { PushToggle } from "@/features/profile/PushToggle";
import { logoutSession } from "@/session/store";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/LocaleProvider";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});

function ProfilePage() {
  const t = useT();
  const navigate = useNavigate();

  const profileQuery = useQuery({
    queryKey: queryKeys.profile.current(),
    queryFn: ({ signal }) => fetchProfile(signal),
    staleTime: 30_000,
    retry: (count, err: unknown) => {
      if (isAppError(err) && err.status === 401) return false;
      return count < 1;
    },
  });

  const api = profileQuery.data;
  const displayName =
    api?.full_name?.trim() ||
    (profileQuery.isLoading ? t("Загрузка…") : t("Имя не указано"));
  const orgLine = [api?.organization?.trim(), api?.city?.trim()]
    .filter(Boolean)
    .join(", ");
  const verification = api?.verification_status ?? "unverified";
  const banner = verificationBanner(
    verification,
    api?.missing_for_verification,
    t,
  );

  if (
    profileQuery.isError &&
    isAppError(profileQuery.error) &&
    profileQuery.error.status === 401
  ) {
    void navigate({
      to: "/login",
      search: { redirect: "/profile", phone: undefined },
    });
  }

  async function onLogout() {
    await logoutSession(getAppQueryClient());
    toast.success(t("Вы вышли из аккаунта"));
    await navigate({ to: "/login" });
  }

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">{t("Профиль")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("Личные данные, организация и безопасность")}
      </p>

      <StateBlock
        isLoading={profileQuery.isLoading}
        isError={profileQuery.isError}
        error={profileQuery.error}
        onRetry={() => void profileQuery.refetch()}
      >
        {api ? (
          <div className="mt-6 space-y-5">
            <section className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground">
                {profileInitials(api.full_name || "?")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{displayName}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {api.phone || t("Телефон не указан")}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {orgLine || t("Организация не указана")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clientTypeLabel(api.client_type, t)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  isVerified(verification)
                    ? "bg-success-soft text-success-strong"
                    : verification === "rejected"
                      ? "bg-danger-soft text-danger-strong"
                      : verification === "pending_verification" ||
                          verification === "pending"
                        ? "bg-warning-soft text-warning-strong"
                        : "bg-muted text-muted-foreground",
                )}
              >
                {verificationLabel(verification, t)}
              </span>
            </section>

            {banner ? (
              <div
                className={cn(
                  "rounded-2xl border p-4",
                  banner.tone === "danger"
                    ? "border-danger/40 bg-danger-soft text-danger-strong"
                    : "border-warning/40 bg-warning-soft text-warning-strong",
                )}
              >
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">{banner.title}</p>
                    <p className="mt-1 text-xs leading-5 opacity-80">
                      {banner.body}
                    </p>
                    <Link
                      to="/profile/organization"
                      className="mt-2 inline-flex text-xs font-semibold underline underline-offset-2"
                    >
                      {banner.cta}
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}

            <Link
              to="/orders"
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition hover:bg-primary-soft/40"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                <Package className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {t("История заказов")}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {t("Заказы, статусы и счета")}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              to="/requests"
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition hover:bg-primary-soft/40"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                <Package className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{t("Заявки на КП")}</span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {t("Запросы цены и коммерческие предложения")}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              to="/service/requests"
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition hover:bg-primary-soft/40"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                <Wrench className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {t("Сервисные заявки")}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {t("История и статусы · новая заявка")}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <PushToggle />

            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <p className="border-b border-border px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("Данные")}
              </p>
              <MenuRow
                to="/profile/edit"
                icon={UserRound}
                label={t("Личные данные")}
                hint={
                  [api.full_name?.trim(), api.phone?.trim()]
                    .filter(Boolean)
                    .join(" · ") || t("ФИО и телефон")
                }
              />
              <MenuRow
                to="/profile/organization"
                icon={Building2}
                label={t("Организация")}
                hint={api.organization?.trim() || t("Реквизиты и адрес")}
              />
              <MenuRow
                to="/profile/security"
                icon={KeyRound}
                label={t("Безопасность")}
                hint={t("Смена пароля")}
                last
              />
            </section>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => void onLogout()}
            >
              <LogOut className="h-4 w-4" />
              {t("Выйти из аккаунта")}
            </Button>

            <Link
              to="/profile/delete"
              className="block w-full text-center text-sm font-semibold text-danger-strong"
            >
              {t("Удалить аккаунт")}
            </Link>
          </div>
        ) : null}
      </StateBlock>
    </AppShell>
  );
}

function MenuRow({
  to,
  icon: Icon,
  label,
  hint,
  last,
}: {
  to: "/profile/edit" | "/profile/organization" | "/profile/security";
  icon: LucideIcon;
  label: string;
  hint: string;
  last?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 transition hover:bg-primary-soft/40",
        !last && "border-b border-border",
      )}
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {hint}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
