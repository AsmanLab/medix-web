import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  confirmPasswordReset,
  requestPasswordReset,
  verifyOtp,
} from "@/api/auth";
import { isAppError } from "@/api/errors";
import { fetchProfile } from "@/api/profile";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { readLastPhone, writeLastPhone } from "@/features/profile/labels";
import { isValidKgPhone, normalizePhone } from "@/lib/phone";
import { useT } from "@/i18n/LocaleProvider";

export const Route = createFileRoute("/profile/security")({
  component: ProfileSecurityPage,
});

const OTP_COOLDOWN_SEC = 60;

function ProfileSecurityPage() {
  const t = useT();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [sent, setSent] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const profileQuery = useQuery({
    queryKey: queryKeys.profile.current(),
    queryFn: ({ signal }) => fetchProfile(signal),
    staleTime: 60_000,
  });

  useEffect(() => {
    const fromApi = profileQuery.data?.phone?.trim();
    if (fromApi) {
      setPhone(fromApi);
      writeLastPhone(fromApi);
      return;
    }
    setPhone(readLastPhone());
  }, [profileQuery.data]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const normalized = normalizePhone(phone);

    if (!sent) {
      if (!isValidKgPhone(normalized)) {
        setFormError(t("Телефон в формате 996XXXXXXXXX"));
        return;
      }
      setSubmitting(true);
      try {
        const res = await requestPasswordReset(normalized);
        setTransactionId(res.transaction_id);
        setPhone(normalized);
        writeLastPhone(normalized);
        setSent(true);
        setCooldown(res.retry_after || OTP_COOLDOWN_SEC);
        toast.success(t("Если аккаунт существует, код отправлен по SMS"));
      } catch (err) {
        // 429 от серверного лимита: держим кнопку закрытой до конца окна.
        if (isAppError(err) && err.status === 429 && err.retryAfter) {
          setCooldown(err.retryAfter);
        }
        setFormError(isAppError(err) ? err.message : t("Не удалось отправить код"));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (otp.trim().length < 4) {
      setFormError(t("Введите код из SMS"));
      return;
    }
    if (password.length < 8) {
      setFormError(t("Новый пароль — минимум 8 символов"));
      return;
    }
    if (password !== password2) {
      setFormError(t("Пароли не совпадают"));
      return;
    }

    setSubmitting(true);
    try {
      // Тот же трёхшаговый путь, что и при сбросе: код обменивается на тикет,
      // и уже по тикету меняется пароль.
      const verified = await verifyOtp({
        transaction_id: transactionId,
        otp_code: otp.trim(),
        purpose: "password_reset",
      });
      await confirmPasswordReset({
        reset_ticket: verified.ticket,
        new_password: password,
      });
      setOtp("");
      setPassword("");
      setPassword2("");
      setSent(false);
      toast.success(t("Пароль обновлён"));
    } catch (err) {
      setFormError(isAppError(err) ? err.message : t("Не удалось сменить пароль"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <Link
        to="/profile"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <ArrowLeft className="h-4 w-4" />{t("К профилю")}
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold">{t("Безопасность")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("Смена пароля через SMS-код (как при восстановлении)")}
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">{t("Новый пароль")}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t("Минимум 8 символов. Подтверждается кодом из SMS.")}
            </p>
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-semibold">{t("Телефон")}</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="field-control mt-1.5"
            placeholder="996700111001"
            inputMode="tel"
            autoComplete="tel"
            disabled={sent}
          />
        </label>

        {sent ? (
          <>
            <label className="block">
              <span className="text-sm font-semibold">{t("Код из SMS")}</span>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="field-control mt-1.5"
                placeholder={t("Код из SMS")}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">{t("Новый пароль")}</span>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                wrapperClassName="mt-1.5"
                autoComplete="new-password"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">{t("Подтвердите пароль")}</span>
              <PasswordInput
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                wrapperClassName="mt-1.5"
                autoComplete="new-password"
              />
            </label>
          </>
        ) : null}

        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting
            ? t("Отправка…")
            : sent
              ? t("Обновить пароль")
              : t("Получить код")}
        </Button>

        {sent ? (
          <button
            type="button"
            className="w-full text-sm font-semibold text-primary disabled:opacity-50"
            disabled={cooldown > 0 || submitting}
            onClick={() => {
              if (cooldown > 0) return;
              void (async () => {
                const normalized = normalizePhone(phone);
                if (!isValidKgPhone(normalized)) {
                  setFormError(t("Телефон в формате 996XXXXXXXXX"));
                  return;
                }
                setSubmitting(true);
                setFormError(null);
                try {
                  await requestPasswordReset(normalized);
                  setCooldown(OTP_COOLDOWN_SEC);
                  toast.success(t("Код отправлен повторно"));
                } catch (err) {
                  setFormError(
                    isAppError(err) ? err.message : t("Не удалось отправить код"),
                  );
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
          >
            {cooldown > 0
              ? t("Отправить код снова через {seconds}с", { seconds: cooldown })
              : t("Отправить код снова")}
          </button>
        ) : null}
      </form>
    </AppShell>
  );
}
