import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { deleteAccount } from "@/api/profile";
import { isAppError } from "@/api/errors";
import { getAppQueryClient } from "@/app/providers";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { logoutSession } from "@/session/store";
import { useT } from "@/i18n/LocaleProvider";

export const Route = createFileRoute("/profile/delete")({
  component: ProfileDeletePage,
});

/**
 * Удаление аккаунта — требование App Store 5.1.1(v) и Play Data safety:
 * удаление должно быть доступно изнутри приложения, а не только по заявке.
 *
 * Пароль спрашивается на самой странице, а не в модалке: короткая форма
 * с одним полем не нуждается во втором экране, только в явном
 * подтверждающем шаге перед необратимым действием — для этого модалка ниже.
 */
function ProfileDeletePage() {
  const t = useT();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showConfirm) return;

    confirmRef.current?.focus();

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowConfirm(false);
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showConfirm]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: async () => {
      setShowConfirm(false);
      await logoutSession(getAppQueryClient());
      toast.success(t("Аккаунт удалён"));
      await navigate({ to: "/" });
    },
    onError: (err) => {
      setShowConfirm(false);
      toast.error(isAppError(err) ? err.message : t("Не удалось удалить аккаунт"));
    },
  });

  const busy = deleteMutation.isPending;

  return (
    <AppShell>
      <Link
        to="/profile"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("К профилю")}
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold">{t("Удалить аккаунт")}</h1>

      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-danger/40 bg-danger-soft p-4 text-sm leading-6 text-danger-strong">
          <p className="font-semibold">
            {t("Это действие необратимо.")}
          </p>
          <p className="mt-2">
            {t(
              "Личные данные, избранное, черновики заявок и push-уведомления будут удалены сразу. Уже оформленные заказы, счета и сервисные заявки останутся — это требование бухгалтерского учёта.",
            )}
          </p>
          <Link
            to="/legal/account-deletion"
            className="mt-2 inline-flex text-xs font-semibold underline underline-offset-2"
          >
            {t("Подробнее об удалении аккаунта")}
          </Link>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (password.length === 0) return;
            setShowConfirm(true);
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="text-sm font-semibold">{t("Подтвердите паролем")}</span>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              wrapperClassName="mt-1.5"
              autoComplete="current-password"
            />
          </label>

          <Button
            type="submit"
            variant="destructive"
            className="w-full"
            disabled={password.length === 0 || busy}
          >
            {t("Удалить аккаунт")}
          </Button>
        </form>
      </div>

      {showConfirm ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setShowConfirm(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            ref={confirmRef}
            tabIndex={-1}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] outline-none"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger-strong">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h2 id="delete-account-title" className="font-display text-xl font-bold">
                  {t("Удалить аккаунт навсегда?")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {t(
                    "Вы выйдете из аккаунта на всех устройствах, а номер телефона освободится.",
                  )}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => deleteMutation.mutate()}
              >
                {busy ? t("Удаляем…") : t("Да, удалить")}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setShowConfirm(false)}
              >
                {t("Отмена")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
