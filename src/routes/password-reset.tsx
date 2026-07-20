import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { confirmPasswordReset, requestPasswordReset } from "@/api/auth";
import { isAppError } from "@/api/errors";
import { requireGuest } from "@/session/guards";
import { logoutSession } from "@/session/store";
import { isValidKgPhone, normalizePhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/password-reset")({
  beforeLoad: () => requireGuest(),
  component: ResetPage,
});

const OTP_COOLDOWN_SEC = 60;

function ResetPage() {
  const nav = useNavigate();
  const [sent, setSent] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

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
        setFormError("Телефон в формате 996XXXXXXXXX");
        return;
      }
      setSubmitting(true);
      try {
        await requestPasswordReset(normalized);
        setPhone(normalized);
        setSent(true);
        setCooldown(OTP_COOLDOWN_SEC);
        toast.success("Если аккаунт существует, код отправлен по SMS");
      } catch (err) {
        setFormError(isAppError(err) ? err.message : "Не удалось отправить код");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!isValidKgPhone(normalized)) {
      setFormError("Телефон в формате 996XXXXXXXXX");
      return;
    }
    if (otp.trim().length < 4) {
      setFormError("Введите код из SMS");
      return;
    }
    if (password.length < 8) {
      setFormError("Новый пароль — минимум 8 символов");
      return;
    }
    if (password !== password2) {
      setFormError("Пароли не совпадают");
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset({
        phone: normalized,
        otp_code: otp.trim(),
        new_password: password,
      });
      await logoutSession();
      toast.success("Пароль изменён. Войдите с новым паролем");
      await nav({
        to: "/login",
        search: { redirect: undefined, phone: normalized },
      });
    } catch (err) {
      const message = isAppError(err) ? err.message : "Не удалось сменить пароль";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-5">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl border border-border bg-card p-6"
        autoComplete="off"
      >
        <h1 className="font-display text-2xl font-bold">Восстановление пароля</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {sent
            ? `Код для номера ${phone}. Введите OTP и новый пароль.`
            : "Отправим одноразовый код на ваш номер."}
        </p>
        <div className="mt-6 space-y-3">
          {!sent ? (
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="996555000000"
              inputMode="numeric"
              className="field-control"
            />
          ) : (
            <>
              <input
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Код (dev: 123456)"
                inputMode="numeric"
                className="field-control"
              />
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Новый пароль"
                autoComplete="new-password"
                className="field-control"
              />
              <input
                required
                type="password"
                minLength={8}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="Повторите пароль"
                autoComplete="new-password"
                className="field-control"
              />
            </>
          )}
          {formError ? (
            <p className="text-sm text-destructive">{formError}</p>
          ) : null}
          <Button disabled={submitting} className="w-full" type="submit">
            {submitting
              ? "Сохраняем…"
              : sent
                ? "Сохранить пароль"
                : "Получить код"}
          </Button>
        </div>
        <Link
          to="/login"
          search={{ redirect: undefined, phone: undefined }}
          className="mt-5 block text-center text-sm text-primary"
        >
          Вернуться ко входу
        </Link>
      </form>
    </main>
  );
}
