import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  confirmPasswordReset,
  requestPasswordReset,
  verifyOtp,
} from "@/api/auth";
import { isAppError } from "@/api/errors";
import { requireGuest } from "@/session/guards";
import { logoutSession } from "@/session/store";
import { isValidKgPhone, normalizePhone } from "@/lib/phone";
import {
  clearOtpFlow,
  cooldownLeft,
  loadOtpFlow,
  OTP_FLOW_KEYS,
  saveOtpFlow,
} from "@/lib/otp-flow-storage";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

export const Route = createFileRoute("/password-reset")({
  beforeLoad: () => requireGuest(),
  component: ResetPage,
});

const FALLBACK_COOLDOWN_SEC = 60;

/**
 * Сброс пароля в три шага: телефон → код → новый пароль.
 *
 * Тот же приём, что и в регистрации: новый пароль вводится после возврата
 * из SMS, поэтому он не живёт в стейте через уход в другое приложение.
 * И так же, как там, шаг с тикетом переживает перезагрузку через
 * sessionStorage — иначе F5 отбрасывал на ввод номера и требовал новой SMS.
 */
function ResetPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [transactionId, setTransactionId] = useState("");
  const [ticket, setTicket] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const saved = loadOtpFlow(OTP_FLOW_KEYS.passwordReset);
    if (!saved) return;
    setPhone(saved.phone);
    setTransactionId(saved.transactionId);
    setTicket(saved.ticket);
    setCooldown(cooldownLeft(saved.cooldownUntil));
    setStep(saved.step);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  function applyError(err: unknown, fallback: string) {
    const message = isAppError(err) ? err.message : fallback;
    // При 429 от серверного лимита гасим «Отправить снова» до конца окна.
    if (isAppError(err) && err.status === 429 && err.retryAfter) {
      setCooldown(err.retryAfter);
    }
    setFormError(message);
    toast.error(message);
  }

  async function requestCode(normalized: string) {
    const res = await requestPasswordReset(normalized);
    const cooldownSec = res.retry_after || FALLBACK_COOLDOWN_SEC;
    setTransactionId(res.transaction_id);
    setCooldown(cooldownSec);
    // Дедлайн, а не остаток: перезагрузка не должна обнулять кулдаун и давать
    // жечь SMS обновлением страницы.
    saveOtpFlow(OTP_FLOW_KEYS.passwordReset, {
      step: 2,
      phone: normalized,
      transactionId: res.transaction_id,
      ticket: "",
      ticketExpiresAt: null,
      cooldownUntil: Date.now() + cooldownSec * 1000,
      codeExpiresAt: null,
    });
  }

  async function onSubmitPhone(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const normalized = normalizePhone(phone);
    if (!isValidKgPhone(normalized)) {
      setFormError("Телефон в формате 996XXXXXXXXX");
      return;
    }
    setSubmitting(true);
    try {
      await requestCode(normalized);
      setPhone(normalized);
      setStep(2);
      toast.success("Если аккаунт существует, код отправлен по SMS");
    } catch (err) {
      applyError(err, "Не удалось отправить код");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (otp.trim().length < 4) {
      setFormError("Введите код из SMS");
      return;
    }
    setSubmitting(true);
    try {
      const res = await verifyOtp({
        transaction_id: transactionId,
        otp_code: otp.trim(),
        purpose: "password_reset",
      });
      setTicket(res.ticket);
      setStep(3);
      saveOtpFlow(OTP_FLOW_KEYS.passwordReset, {
        step: 3,
        phone,
        transactionId,
        ticket: res.ticket,
        ticketExpiresAt: res.expires_at ? Date.parse(res.expires_at) : null,
        cooldownUntil: null,
        codeExpiresAt: null,
      });
    } catch (err) {
      applyError(err, "Не удалось подтвердить код");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
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
        reset_ticket: ticket,
        new_password: password,
      });
      clearOtpFlow(OTP_FLOW_KEYS.passwordReset);
      await logoutSession();
      toast.success("Пароль изменён. Войдите с новым паролем");
      await nav({ to: "/login", search: { redirect: undefined, phone } });
    } catch (err) {
      applyError(err, "Не удалось сменить пароль");
    } finally {
      setSubmitting(false);
    }
  }

  const subtitle =
    step === 1
      ? "Отправим одноразовый код на ваш номер."
      : step === 2
        ? `Код отправлен на ${phone}.`
        : "Номер подтверждён. Придумайте новый пароль.";

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-5">
      <section
        className="w-full max-w-md rounded-3xl border border-border bg-card p-6"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Шаг {step} из 3
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold">
          Восстановление пароля
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

        {step === 1 ? (
          <form onSubmit={onSubmitPhone} className="mt-6 space-y-3">
            <input
              required
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="996555000000"
              inputMode="numeric"
              autoComplete="tel"
              aria-label="Номер телефона"
              className="field-control"
            />
            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}
            <Button disabled={submitting} className="w-full" type="submit">
              {submitting ? "Отправляем…" : "Получить код"}
            </Button>
          </form>
        ) : null}

        {step === 2 ? (
          <form onSubmit={onSubmitCode} className="mt-6 space-y-3">
            <input
              required
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Код из SMS"
              maxLength={8}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="Код из SMS"
              className="field-control"
            />
            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}
            <Button disabled={submitting} className="w-full" type="submit">
              {submitting ? "Проверяем…" : "Подтвердить"}
            </Button>
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-sm text-primary"
                onClick={() => {
                  setStep(1);
                  setOtp("");
                  setTransactionId("");
                  setFormError(null);
                  clearOtpFlow(OTP_FLOW_KEYS.passwordReset);
                }}
              >
                Не тот номер?
              </button>
              <button
                type="button"
                disabled={cooldown > 0 || submitting}
                className="text-sm text-primary disabled:text-muted-foreground"
                onClick={async () => {
                  try {
                    await requestCode(phone);
                    toast.success("Код отправлен повторно");
                  } catch (err) {
                    applyError(err, "Не удалось отправить код");
                  }
                }}
              >
                {cooldown > 0 ? `Повтор через ${cooldown} с` : "Отправить снова"}
              </button>
            </div>
          </form>
        ) : null}

        {step === 3 ? (
          <form onSubmit={onSubmitPassword} className="mt-6 space-y-3">
            <PasswordInput
              required
              autoFocus
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Новый пароль"
              autoComplete="new-password"
              aria-label="Новый пароль"
            />
            <PasswordInput
              required
              minLength={8}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="Повторите пароль"
              autoComplete="new-password"
              aria-label="Повторите пароль"
            />
            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}
            <Button disabled={submitting} className="w-full" type="submit">
              {submitting ? "Сохраняем…" : "Сохранить пароль"}
            </Button>
          </form>
        ) : null}

        <Link
          to="/login"
          search={{ redirect: undefined, phone: undefined }}
          className="mt-5 block text-center text-sm text-primary"
        >
          Вернуться ко входу
        </Link>
      </section>
    </main>
  );
}
