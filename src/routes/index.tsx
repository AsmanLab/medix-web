import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartPulse } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { useSession } from "@/session/store";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const session = useSession();
  const isAuthed = session.status === "authenticated";

  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-surface to-mint/30 px-6 py-16 sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Medix International
        </p>
        <h1 className="mt-4 max-w-xl font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl">
          Медицинское оборудование для клиник Кыргызстана
        </h1>
        <p className="mt-4 max-w-lg text-sm text-muted-foreground sm:text-base">
          Каталог, запросы цены (RFQ), заказы и сервис — в одном кабинете.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/catalog"
            className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Смотреть каталог
          </Link>
          {isAuthed ? (
            <Link
              to="/profile"
              className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-5 text-sm font-semibold"
            >
              Личный кабинет
            </Link>
          ) : (
            <Link
              to="/login"
              search={{ redirect: undefined, phone: undefined }}
              className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-5 text-sm font-semibold"
            >
              Войти
            </Link>
          )}
        </div>
        <HeartPulse className="pointer-events-none absolute -right-6 -bottom-6 h-40 w-40 text-primary/15" />
      </section>
    </AppShell>
  );
}
