import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock3, MapPin, Phone, Building2, ExternalLink } from "lucide-react";
import { fetchContacts } from "@/api/cms";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { mapsSearchUrl } from "@/features/cms/promotions";
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
          <ul className="space-y-4">
            {offices.map((office) => {
              const mapHref =
                office.map_embed_url?.trim() ||
                (office.address.trim() ? mapsSearchUrl(office.address) : null);
              return (
                <li
                  key={office.id}
                  className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
                >
                  <h2 className="font-display text-xl font-bold">
                    {office.name}
                  </h2>
                  {office.address ? (
                    <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {office.address}
                    </p>
                  ) : null}
                  {office.working_hours ? (
                    <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {office.working_hours}
                    </p>
                  ) : null}

                  <dl className="mt-4 grid gap-2 sm:grid-cols-3">
                    <PhoneRow label={t("Продажи")} value={office.phone_sales} />
                    <PhoneRow label={t("Сервис")} value={office.phone_service} />
                    <PhoneRow
                      label={t("Бухгалтерия")}
                      value={office.phone_accounting}
                    />
                  </dl>

                  {mapHref ? (
                    <a
                      href={mapHref}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
                    >
                      {t("На карте")} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}

                  {office.map_embed_url?.trim().startsWith("http") ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                      <iframe
                        title={t("Карта — {name}", { name: office.name })}
                        src={office.map_embed_url.trim()}
                        className="aspect-[16/9] w-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  ) : null}
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
