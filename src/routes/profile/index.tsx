import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ChevronRight,
  FileText,
  KeyRound,
  LogOut,
  Package,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { listOrders } from "@/api/orders";
import { fetchProfile } from "@/api/profile";
import { listRfqs } from "@/api/rfq";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { getAppQueryClient } from "@/app/providers";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import {
  clientTypeLabel,
  isVerified,
  needsVerificationBanner,
  profileInitials,
  verificationLabel,
} from "@/features/profile/labels";
import { logoutSession } from "@/session/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});

function ProfilePage() {
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

  const rfqsQuery = useQuery({
    queryKey: queryKeys.rfq.list(),
    queryFn: ({ signal }) => listRfqs(signal),
    staleTime: 30_000,
  });

  const ordersQuery = useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: ({ signal }) => listOrders(signal),
    staleTime: 30_000,
  });

  const api = profileQuery.data;
  const displayName =
    api?.full_name?.trim() ||
    (profileQuery.isLoading ? "Загрузка…" : "Имя не указано");
  const orgLine = [api?.organization?.trim(), api?.city?.trim()]
    .filter(Boolean)
    .join(", ");
  const verification = api?.verification_status ?? "unverified";
  const rfqCount = (rfqsQuery.data ?? []).filter((r) => r.status !== "draft")
    .length;
  const orderCount = (ordersQuery.data ?? []).length;

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
    toast.success("Вы вышли из аккаунта");
    await navigate({ to: "/login" });
  }

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">Профиль</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Личные данные, организация и безопасность
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
                  {api.phone || "Телефон не указан"}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {orgLine || "Организация не указана"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clientTypeLabel(api.client_type)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  isVerified(verification)
                    ? "bg-emerald-100 text-emerald-800"
                    : verification === "rejected"
                      ? "bg-red-100 text-red-800"
                      : verification === "pending_verification" ||
                          verification === "pending"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-muted text-muted-foreground",
                )}
              >
                {verificationLabel(verification)}
              </span>
            </section>

            {needsVerificationBanner(verification) ? (
              <div className="rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-amber-950">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold">Проверка организации</p>
                    <p className="mt-1 text-xs leading-5 text-amber-900/75">
                      Пока проверка не завершена, доступны запросы цены (RFQ).
                      Прямой заказ откроется после подтверждения. Обычно это
                      занимает 1–2 рабочих дня.
                    </p>
                    <Link
                      to="/profile/organization"
                      className="mt-2 inline-flex text-xs font-semibold text-amber-800"
                    >
                      Проверить данные организации →
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}

            <Link
              to="/requests"
              className="block overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.5_0.12_200)] p-5 text-primary-foreground shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/70">
                    История
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold">
                    Заявки и заказы
                  </h2>
                  <p className="mt-1 text-xs text-white/70">
                    Статусы, котировки и счета
                  </p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
                  <Package className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <span className="rounded-2xl bg-white/10 px-3 py-3">
                  <span className="flex items-center gap-2 text-[11px] text-white/70">
                    <FileText className="h-3.5 w-3.5" /> Заявки
                  </span>
                  <b className="mt-1 block text-xl">{rfqCount}</b>
                </span>
                <span className="rounded-2xl bg-white/10 px-3 py-3">
                  <span className="flex items-center gap-2 text-[11px] text-white/70">
                    <Package className="h-3.5 w-3.5" /> Заказы
                  </span>
                  <b className="mt-1 block text-xl">{orderCount}</b>
                </span>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold">
                Открыть <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </Link>

            <Link
              to="/service/requests"
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition hover:bg-primary-soft/40"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                <Wrench className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Сервисные заявки</span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  История и статусы · новая заявка
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <p className="border-b border-border px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Данные
              </p>
              <MenuRow
                to="/profile/edit"
                icon={UserRound}
                label="Личные данные"
                hint={
                  [api.full_name?.trim(), api.phone?.trim()]
                    .filter(Boolean)
                    .join(" · ") || "ФИО и телефон"
                }
              />
              <MenuRow
                to="/profile/organization"
                icon={Building2}
                label="Организация"
                hint={api.organization?.trim() || "Реквизиты и адрес"}
              />
              <MenuRow
                to="/profile/security"
                icon={KeyRound}
                label="Безопасность"
                hint="Смена пароля"
                last
              />
            </section>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => void onLogout()}
            >
              <LogOut className="h-4 w-4" />
              Выйти из аккаунта
            </Button>
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
