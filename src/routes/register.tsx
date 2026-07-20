import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { sendOtp } from "@/api/auth";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { requireGuest } from "@/session/guards";
import { registerWithOtp } from "@/session/store";
import { isValidKgPhone, normalizePhone } from "@/lib/phone";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/register")({
  beforeLoad: () => requireGuest(),
  component: RegisterPage,
});

const OTP_COOLDOWN_SEC = 60;

function RegisterPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const normalized = normalizePhone(phone);
    if (!isValidKgPhone(normalized)) {
      setFormError("Телефон в формате 996XXXXXXXXX");
      return;
    }
    if (password.length < 8) {
      setFormError("Пароль — минимум 8 символов");
      return;
    }
    if (fullName.trim().length < 2) {
      setFormError("Укажите ФИО");
      return;
    }
    setSubmitting(true);
    try {
      await sendOtp(normalized, "registration");
      setPhone(normalized);
      setStep(2);
      setCooldown(OTP_COOLDOWN_SEC);
      toast.success("Код отправлен по SMS");
    } catch (err) {
      const message = isAppError(err) ? err.message : "Не удалось отправить код";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmRegister(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (otp.length < 4) {
      setFormError("Введите код из SMS");
      return;
    }
    setSubmitting(true);
    try {
      await registerWithOtp({
        phone,
        otp_code: otp,
        password,
        full_name: fullName.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      toast.success("Аккаунт создан");
      await nav({ to: "/profile" });
    } catch (err) {
      const message = isAppError(err)
        ? err.message
        : "Не удалось зарегистрироваться";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-5">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Шаг {step} из 2
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold">
          {step === 1 ? "Регистрация" : "Подтвердите номер"}
        </h1>
        {step === 1 ? (
          <form onSubmit={requestCode} className="mt-6 space-y-3">
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="ФИО"
              className="field-control"
            />
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="996555000000"
              inputMode="numeric"
              className="field-control"
            />
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль (мин. 8)"
              className="field-control"
            />
            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}
            <Button disabled={submitting} className="w-full" type="submit">
              {submitting ? "Отправляем…" : "Получить код"}
            </Button>
          </form>
        ) : (
          <form onSubmit={confirmRegister} className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">Код для {phone}</p>
            <input
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Код (dev: 123456)"
              inputMode="numeric"
              className="field-control"
            />
            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}
            <Button disabled={submitting} className="w-full" type="submit">
              {submitting ? "Создаём…" : "Создать аккаунт"}
            </Button>
            <button
              type="button"
              disabled={cooldown > 0 || submitting}
              className="text-sm text-primary disabled:text-muted-foreground"
              onClick={async () => {
                try {
                  await sendOtp(phone, "registration");
                  setCooldown(OTP_COOLDOWN_SEC);
                  toast.success("Код отправлен повторно");
                } catch (err) {
                  toast.error(isAppError(err) ? err.message : "Ошибка");
                }
              }}
            >
              {cooldown > 0 ? `Повтор через ${cooldown} с` : "Отправить снова"}
            </button>
          </form>
        )}
        <Link
          to="/login"
          search={{ redirect: undefined, phone: undefined }}
          className="mt-5 block text-center text-sm text-primary"
        >
          Уже есть аккаунт
        </Link>
      </section>
    </main>
  );
}
