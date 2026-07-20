import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";

type SuccessSearch = {
  rfqId?: string;
};

export const Route = createFileRoute("/cart/success")({
  validateSearch: (search: Record<string, unknown>): SuccessSearch => ({
    rfqId: typeof search.rfqId === "string" ? search.rfqId : undefined,
  }),
  component: CartSuccessPage,
});

function CartSuccessPage() {
  const { rfqId } = Route.useSearch();

  return (
    <AppShell>
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-bold">Запрос отправлен</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Менеджер подготовит коммерческое предложение и свяжется с вами.
        </p>
        {rfqId ? (
          <p className="mt-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
            Номер запроса:{" "}
            <span className="font-mono font-semibold text-foreground">{rfqId}</span>
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {rfqId ? (
            <Link
              to="/requests/$rfqId"
              params={{ rfqId }}
              className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Открыть заявку
            </Link>
          ) : null}
          <Link
            to="/requests"
            className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-5 text-sm font-semibold"
          >
            Все заявки
          </Link>
          <Link
            to="/catalog"
            search={{ q: undefined }}
            className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-5 text-sm font-semibold"
          >
            В каталог
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
