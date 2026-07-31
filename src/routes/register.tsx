import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { sendOtp, verifyOtp } from "@/api/auth";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { requireGuest } from "@/session/guards";
import { registerWithTicket } from "@/session/store";
import { isValidKgPhone, normalizePhone } from "@/lib/phone";
import {
  clearOtpFlow,
  cooldownLeft,
  loadOtpFlow,
  OTP_FLOW_KEYS,
  saveOtpFlow,
} from "@/lib/otp-flow-storage";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/register")({
  beforeLoad: () => requireGuest(),
  component: RegisterPage,
});

const FALLBACK_COOLDOWN_SEC = 60;

/**
 * Регистрация в три шага: телефон → код → ФИО и пароль.
 *
 * Пароль спрашивается последним намеренно. Между отправкой SMS и вводом кода
 * пользователь уходит в приложение сообщений: на вебе он может обновить
 * страницу, на Android процесс может быть убит. Если пароль собирать первым,
 * он теряется вместе со стейтом, а persist'ить его некуда — sessionStorage
 * для пароля не годится. На последнем шаге терять уже нечего: номер
 * подтверждён и на руках тикет.
 *
 * Чтобы это «терять нечего» стало правдой, шаг и тикет переживают
 * перезагрузку через sessionStorage (@/lib/otp-flow-storage). Без этого F5
 * возвращал на ввод номера и требовал новой SMS — то есть весь смысл
 * трёхшаговой схемы пропадал.
 */
function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const nav = useNavigate();
  const queryClient = useQueryClient();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [pdConsent, setPdConsent] = useState(false);

  const [transactionId, setTransactionId] = useState("");
  const [ticket, setTicket] = useState("");
  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Восстановление после перезагрузки: пароля в хранилище нет, поэтому
  // возвращаемся ровно туда, где пользователь был, не запрашивая новую SMS.
  useEffect(() => {
    const saved = loadOtpFlow(OTP_FLOW_KEYS.registration);
    if (!saved) return;
    setPhone(saved.phone);
    setTransactionId(saved.transactionId);
    setTicket(saved.ticket);
    setCodeExpiresAt(saved.codeExpiresAt);
    setCooldown(cooldownLeft(saved.cooldownUntil));
    setStep(saved.step);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  // Обратный отсчёт по expires_at с сервера, а не по локальным часам.
  useEffect(() => {
    if (codeExpiresAt === null || step !== 2) return;
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.round((codeExpiresAt - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [codeExpiresAt, step]);

  function applyError(err: unknown, fallback: string) {
    const message = isAppError(err) ? err.message : fallback;
    // Сервер тоже лимитирует отправку кода: при 429 гасим кнопку до конца
    // окна, иначе пользователь жмёт «Отправить снова» и получает ту же ошибку.
    if (isAppError(err) && err.status === 429 && err.retryAfter) {
      setCooldown(err.retryAfter);
    }
    setFormError(message);
    toast.error(message);
  }

  async function requestCode(normalized: string) {
    const res = await sendOtp(normalized, "registration");
    const codeExpires = res.expires_at ? Date.parse(res.expires_at) : null;
    const cooldownSec = res.retry_after || FALLBACK_COOLDOWN_SEC;
    setTransactionId(res.transaction_id);
    setCodeExpiresAt(codeExpires);
    setCooldown(cooldownSec);
    // Кулдаун сохраняем дедлайном, а не остатком: иначе перезагрузка обнуляла
    // бы его и позволяла жечь SMS обновлением страницы.
    saveOtpFlow(OTP_FLOW_KEYS.registration, {
      step: 2,
      phone: normalized,
      transactionId: res.transaction_id,
      ticket: "",
      ticketExpiresAt: null,
      cooldownUntil: Date.now() + cooldownSec * 1000,
      codeExpiresAt: codeExpires,
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
      toast.success("Код отправлен по SMS");
    } catch (err) {
      applyError(err, "Не удалось отправить код");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (otp.length < 4) {
      setFormError("Введите код из SMS");
      return;
    }
    setSubmitting(true);
    try {
      const res = await verifyOtp({
        transaction_id: transactionId,
        otp_code: otp,
        purpose: "registration",
      });
      setTicket(res.ticket);
      setStep(3);
      saveOtpFlow(OTP_FLOW_KEYS.registration, {
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

  async function onSubmitProfile(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (fullName.trim().length < 2) {
      setFormError("Укажите ФИО");
      return;
    }
    if (password.length < 8) {
      setFormError("Пароль — минимум 8 символов");
      return;
    }
    if (!pdConsent) {
      // Дублирует серверную проверку (код consent_required): согласие должно
      // быть осознанным действием, поэтому флаг не проставляется автоматически.
      setFormError("Нужно согласие на обработку персональных данных");
      return;
    }
    setSubmitting(true);
    try {
      await registerWithTicket({
        registration_ticket: ticket,
        password,
        full_name: fullName.trim(),
        pd_consent: pdConsent,
        phone,
      });
      clearOtpFlow(OTP_FLOW_KEYS.registration);
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      toast.success("Аккаунт создан");
      await nav({ to: "/profile" });
    } catch (err) {
      applyError(err, "Не удалось зарегистрироваться");
    } finally {
      setSubmitting(false);
    }
  }

  function backToPhone() {
    setStep(1);
    setOtp("");
    setTransactionId("");
    setCodeExpiresAt(null);
    setFormError(null);
    clearOtpFlow(OTP_FLOW_KEYS.registration);
  }

  const title =
    step === 1
      ? "Регистрация"
      : step === 2
        ? "Подтвердите номер"
        : "Последний шаг";

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-5">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Шаг {step} из 3
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold">{title}</h1>

        {step === 1 ? (
          <form onSubmit={onSubmitPhone} className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Отправим код подтверждения по SMS.
            </p>
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
            <p className="text-sm text-muted-foreground">
              Код отправлен на {phone}
            </p>
            <input
              required
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Код (dev: 123456)"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="Код из SMS"
              className="field-control"
            />
            {secondsLeft !== null ? (
              <p className="text-xs text-muted-foreground">
                {secondsLeft > 0
                  ? `Код действует ещё ${Math.floor(secondsLeft / 60)}:${String(
                      secondsLeft % 60,
                    ).padStart(2, "0")}`
                  : "Срок действия кода истёк — запросите новый"}
              </p>
            ) : null}
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
                onClick={backToPhone}
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
          <form onSubmit={onSubmitProfile} className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Номер {phone} подтверждён. Осталось назвать себя и придумать
              пароль.
            </p>
            <input
              required
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="ФИО"
              autoComplete="name"
              aria-label="ФИО"
              className="field-control"
            />
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль (мин. 8)"
              autoComplete="new-password"
              aria-label="Пароль"
              className="field-control"
            />
            <p className="text-xs text-muted-foreground">
              Данные организации можно будет заполнить позже в профиле.
            </p>
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={pdConsent}
                onChange={(e) => setPdConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span className="text-muted-foreground">
                Согласен на обработку персональных данных и принимаю{" "}
                <Link
                  to="/pages/$slug"
                  params={{ slug: "privacy" }}
                  target="_blank"
                  className="text-primary underline"
                >
                  условия
                </Link>
                .
              </span>
            </label>
            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}
            <Button
              disabled={submitting || !pdConsent}
              className="w-full"
              type="submit"
            >
              {submitting ? "Создаём…" : "Создать аккаунт"}
            </Button>
          </form>
        ) : null}

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
