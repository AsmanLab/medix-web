import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { useT } from "@/i18n/LocaleProvider";

type SuccessSearch = {
  requestId?: string;
};

export const Route = createFileRoute("/service/success")({
  validateSearch: (search: Record<string, unknown>): SuccessSearch => ({
    requestId:
      typeof search.requestId === "string" ? search.requestId : undefined,
  }),
  component: ServiceSuccessPage,
});

function ServiceSuccessPage() {
  const t = useT();
  const { requestId } = Route.useSearch();

  return (
    <AppShell>
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-bold">
          {t("Заявка принята")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Инженер свяжется с вами в рабочее время для уточнения деталей и
          согласования визита.
        </p>
        {requestId ? (
          <p className="mt-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
            Номер заявки:{" "}
            <span className="font-mono font-semibold text-foreground">
              {requestId}
            </span>
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {requestId ? (
            <Link
              to="/service/requests/$requestId"
              params={{ requestId }}
              className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              {t("Открыть заявку")}
            </Link>
          ) : null}
          <Link
            to="/service/requests"
            className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-5 text-sm font-semibold"
          >
            {t("Мои сервисные заявки")}
          </Link>
          <Link
            to="/service"
            className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-5 text-sm font-semibold"
          >
            {t("Ещё одна заявка")}
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
