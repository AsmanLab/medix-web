import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LockKeyhole, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { isAppError } from "@/api/errors";
import { requireGuest } from "@/session/guards";
import {
  landingPathForRole,
  loginWithPassword,
} from "@/session/store";
import { isValidKgPhone, normalizePhone } from "@/lib/phone";
import { isSafeInternalPath } from "@/lib/redirect";
import { Button } from "@/components/ui/button";

type LoginSearch = { redirect?: string; phone?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    // Чужой адрес отбрасываем прямо на разборе — тогда он не доедет ни до
    // навигации после входа, ни до ссылок «Зарегистрироваться».
    redirect: isSafeInternalPath(search.redirect) ? search.redirect : undefined,
    phone: typeof search.phone === "string" ? search.phone : undefined,
  }),
  beforeLoad: () => requireGuest(),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const { redirect: redirectTo, phone: phoneFromSearch } = Route.useSearch();
  const [phone, setPhone] = useState(phoneFromSearch ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const normalized = normalizePhone(phone);
    if (!isValidKgPhone(normalized)) {
      setFormError("Телефон в формате 996XXXXXXXXX");
      return;
    }
    setSubmitting(true);
    try {
      const session = await loginWithPassword(normalized, password);
      toast.success("Добро пожаловать!");
      const role = session.user!.role;
      if (redirectTo && isSafeInternalPath(redirectTo) && role === "client") {
        await nav({ href: redirectTo });
        return;
      }
      const path = landingPathForRole(role);
      await nav({ href: path });
    } catch (err) {
      const message = isAppError(err) ? err.message : "Не удалось войти";
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
        className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
      >
        <h1 className="text-center font-display text-2xl font-bold">Вход в Medix</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Телефон и пароль
        </p>
        <label className="mt-6 block text-sm font-medium">
          Телефон
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-border px-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="996555000000"
              inputMode="numeric"
              autoComplete="username"
              name="phone"
              className="h-12 flex-1 bg-transparent outline-none"
            />
          </div>
        </label>
        <label className="mt-4 block text-sm font-medium">
          Пароль
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-border px-3">
            <LockKeyhole className="h-4 w-4 text-muted-foreground" />
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              name="password"
              className="h-12 flex-1 bg-transparent outline-none"
            />
          </div>
        </label>
        {formError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="mt-3 text-right">
          <Link to="/password-reset" className="text-sm text-primary">
            Забыли пароль?
          </Link>
        </div>
        <Button disabled={submitting} className="mt-5 w-full" type="submit">
          {submitting ? "Входим…" : "Войти"}
        </Button>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Нет аккаунта?{" "}
          <Link to="/register" className="font-semibold text-primary">
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </main>
  );
}
