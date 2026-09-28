import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock3, MapPin, Phone, Building2 } from "lucide-react";
import { fetchContacts } from "@/api/cms";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { OfficeMap } from "@/components/shared/OfficeMap";
import { StateBlock } from "@/components/shared/StateBlock";
import { usePageMeta } from "@/lib/page-meta";
import { useT } from "@/i18n/LocaleProvider";

export const Route = createFileRoute("/contacts")({
  component: ContactsPage,
});

function ContactsPage() {
  const t = useT();
  usePageMeta({
    title: t("Контакты"),
    description: t("Офисы, телефоны и часы работы Medix International."),
  });

  const query = useQuery({
    queryKey: queryKeys.cms.contacts(),
    queryFn: ({ signal }) => fetchContacts(signal),
  });

  const offices = query.data ?? [];

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">{t("Контакты")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("Офисы Medix International — продажи, сервис и бухгалтерия")}
      </p>

      <div className="mt-8">
        <StateBlock
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={query.isSuccess && offices.length === 0}
          onRetry={() => void query.refetch()}
          emptyTitle={t("Контакты не опубликованы")}
          emptyDescription={t("Данные появятся после заполнения в CMS.")}
          emptyFallback={
            <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <Building2 className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 font-semibold">{t("Офисы пока не добавлены")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Пока можно оставить сервисную заявку онлайн.")}
              </p>
              <Link
                to="/service"
                className="mt-5 inline-flex text-sm font-semibold text-primary"
              >
                {t("Сервис")}
              </Link>
            </div>
          }
        >
          <ul className="space-y-6">
            {offices.map((office) => {
              const address = office.address.trim();
              return (
                <li
                  key={office.id}
                  className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]"
                >
                  <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                    <div className="p-5 sm:p-7">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                          <Building2 className="h-5 w-5" />
                        </span>
                        <h2 className="font-display text-xl font-bold">
                          {office.name}
                        </h2>
                      </div>

                      {address ? (
                        <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {address}
                        </p>
                      ) : null}
                      {office.working_hours ? (
                        <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {office.working_hours}
                        </p>
                      ) : null}

                      <dl className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                        <PhoneRow label={t("Продажи")} value={office.phone_sales} />
                        <PhoneRow label={t("Сервис")} value={office.phone_service} />
                        <PhoneRow
                          label={t("Бухгалтерия")}
                          value={office.phone_accounting}
                        />
                      </dl>
                    </div>

                    <div className="border-t border-border lg:border-l lg:border-t-0">
                      {address || office.map_embed_url?.trim() ? (
                        <OfficeMap
                          officeName={office.name}
                          address={address}
                          explicitEmbedUrl={office.map_embed_url}
                        />
                      ) : (
                        <div className="grid min-h-[160px] h-full place-items-center gap-2 bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
                          <MapPin className="mx-auto h-6 w-6" />
                          {t("Адрес пока не указан")}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </StateBlock>
      </div>
    </AppShell>
  );
}

function PhoneRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) return null;
  return (
    <div className="rounded-2xl bg-secondary/50 px-3 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1">
        <a
          href={`tel:${value.replace(/\s/g, "")}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold"
        >
          <Phone className="h-3.5 w-3.5 text-primary" />
          {value}
        </a>
      </dd>
    </div>
  );
}
