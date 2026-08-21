import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileUp,
  MapPin,
  Phone,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { isAppError } from "@/api/errors";
import { fetchCmsPage } from "@/api/cms";
import { listOrders } from "@/api/orders";
import { fetchProfile } from "@/api/profile";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { FormField } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { CmsHtml } from "@/features/cms/CmsHtml";
import {
  createPhotoDraft,
  desiredDateToIso,
  equipmentTypeOptions,
  MAX_SERVICE_PHOTOS,
  revokePhotoDraft,
  submitServiceRequestWithPhotos,
  validateServicePhoto,
  type PhotoDraft,
} from "@/features/service/submit";
import { useSession } from "@/session/store";
import { usePageMeta } from "@/lib/page-meta";
import { useT } from "@/i18n/LocaleProvider";

export const Route = createFileRoute("/service/")({
  component: ServicePage,
});

function serviceCards(t: ReturnType<typeof useT>) {
  return [
    {
      icon: Wrench,
      title: t("Диагностика и ремонт"),
      text: t("Найдём неисправность, согласуем работы и восстановим оборудование."),
    },
    {
      icon: ShieldCheck,
      title: t("Гарантийное ТО"),
      text: t("Плановое обслуживание по регламенту производителя и Medix."),
    },
    {
      icon: MapPin,
      title: t("Выезд инженера"),
      text: t("Специалист приедет в клинику в Бишкеке или другом регионе КР."),
    },
    {
      icon: CheckCircle2,
      title: t("Пусконаладка"),
      text: t("Установка, настройка и обучение персонала перед началом работы."),
    },
  ] as const;
}

function ServicePage() {
  const t = useT();
  usePageMeta({
    title: t("Сервис и ремонт"),
    description: t(
      "Диагностика, ремонт, гарантийное обслуживание и выезд инженера.",
    ),
  });

  const session = useSession();
  const navigate = useNavigate();
  const authenticated = session.status === "authenticated";

  const [equipmentType, setEquipmentType] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [orderId, setOrderId] = useState("");
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const profileQuery = useQuery({
    queryKey: queryKeys.profile.current(),
    queryFn: ({ signal }) => fetchProfile(signal),
    enabled: authenticated,
    staleTime: 30_000,
  });

  const cmsQuery = useQuery({
    queryKey: queryKeys.cms.page("service"),
    queryFn: ({ signal }) => fetchCmsPage("service", signal),
    retry: (count, err: unknown) => {
      if (isAppError(err) && err.status === 404) return false;
      return count < 1;
    },
  });

  const ordersQuery = useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: ({ signal }) => listOrders(signal),
    enabled: authenticated,
    staleTime: 30_000,
  });

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    setContactName((prev) => prev || p.full_name?.trim() || "");
    setContactPhone((prev) => prev || p.phone?.trim() || "");
    setAddress((prev) => {
      if (prev) return prev;
      return [p.city?.trim(), p.address?.trim()].filter(Boolean).join(", ");
    });
  }, [profileQuery.data]);

  useEffect(() => {
    return () => {
      for (const photo of photos) revokePhotoDraft(photo);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
  }, []);

  function onPickPhotos(files: FileList | null) {
    if (!files?.length) return;
    const next: PhotoDraft[] = [...photos];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_SERVICE_PHOTOS) {
        toast.message(t("Максимум {count} фото", { count: MAX_SERVICE_PHOTOS }));
        break;
      }
      const err = validateServicePhoto(file, t);
      if (err) {
        toast.error(err);
        continue;
      }
      next.push(createPhotoDraft(file));
    }
    setPhotos(next);
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) revokePhotoDraft(target);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (!authenticated) {
      toast.message(t("Войдите, чтобы отправить сервисную заявку"));
      await navigate({
        to: "/login",
        search: { redirect: "/service", phone: undefined },
      });
      return;
    }

    if (!equipmentType.trim()) {
      toast.error(t("Выберите тип оборудования"));
      return;
    }
    if (!description.trim()) {
      toast.error(t("Опишите проблему"));
      return;
    }
    if (!address.trim()) {
      toast.error(t("Укажите адрес"));
      return;
    }
    if (!contactName.trim()) {
      toast.error(t("Укажите контактное лицо"));
      return;
    }
    if (!contactPhone.trim()) {
      toast.error(t("Укажите телефон"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitServiceRequestWithPhotos(
        {
          equipment_type: equipmentType.trim(),
          model: model.trim(),
          serial_number: serialNumber.trim(),
          description: description.trim(),
          desired_date: desiredDateToIso(desiredDate),
          address: address.trim(),
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim(),
          order_id: orderId || null,
        },
        photos.map((p) => p.file),
      );
      for (const photo of photos) revokePhotoDraft(photo);
      setPhotos([]);
      toast.success(t("Заявка отправлена"));
      await navigate({
        to: "/service/success",
        search: { requestId: result.id },
      });
    } catch (err) {
      toast.error(
        isAppError(err) ? err.message : t("Не удалось отправить заявку"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <section>
        <div className="relative overflow-hidden rounded-[28px] bg-[oklch(.24_.06_238)] px-6 py-10 text-white sm:rounded-[36px] sm:px-10 sm:py-14">
          <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]">
              <Wrench className="h-3.5 w-3.5" /> {t("Сервисный центр Medix")}
            </span>
            <h1 className="mt-5 font-display text-[34px] font-bold leading-tight tracking-tight sm:text-5xl">
              {t("Поддерживаем оборудование в рабочем состоянии")}
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-white/65 sm:text-base sm:leading-7">
              Техническое обслуживание, ремонт, выезд инженера и гарантийная
              поддержка медицинского оборудования.
            </p>
            <div className="mt-7 flex flex-wrap gap-5 text-xs text-white/75 sm:text-sm">
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-[oklch(.78_.11_209)]" /> Ответ в
                рабочее время
              </span>
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-[oklch(.78_.11_209)]" /> +996
                (312) 66-00-66
              </span>
            </div>
          </div>
        </div>
      </section>

      {cmsQuery.data?.body_html ? (
        <section className="mt-8 rounded-3xl border border-border bg-card p-5 sm:p-7">
          <h2 className="font-display text-xl font-bold">
            {cmsQuery.data.title || t("О сервисе")}
          </h2>
          <div className="mt-4">
            <CmsHtml html={cmsQuery.data.body_html} />
          </div>
        </section>
      ) : null}

      <section className="mt-10 grid grid-cols-2 gap-3 sm:mt-14 sm:grid-cols-4 sm:gap-5">
        {serviceCards(t).map(({ icon: Icon, title, text }) => (
          <article
            key={title}
            className="rounded-[22px] border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-sm font-bold leading-snug sm:text-base">
              {title}
            </h2>
            <p className="mt-2 hidden text-xs leading-5 text-muted-foreground sm:block">
              {text}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-12 grid gap-8 pb-6 sm:mt-16 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            {t("Заявка на сервис")}
          </p>
          <h2 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight sm:text-[38px]">
            {t("Расскажите, что случилось")}
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {t(
              "Укажите оборудование и опишите проблему. Инженер изучит заявку и свяжется с вами для уточнения деталей.",
            )}
          </p>
          <div className="mt-7 space-y-4">
            {[
              t("Заявке присваивается номер и статус «Новая»"),
              t("Статус можно отслеживать в личном кабинете"),
              t("Можно приложить до 5 фото неисправности"),
            ].map((item) => (
              <div key={item} className="flex gap-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          {authenticated ? (
            <Link
              to="/service/requests"
              className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              {t("Мои сервисные заявки")} <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="rounded-[28px] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-7"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("Тип оборудования *")}>
              <select
                required
                className="field-control"
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
              >
                <option value="">{t("Выберите тип")}</option>
                {equipmentTypeOptions(t).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("Модель или артикул")}>
              <input
                className="field-control"
                placeholder={t("Например, OMRON M3")}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </FormField>
            <FormField label={t("Серийный номер")}>
              <input
                className="field-control"
                placeholder={t("Если известен")}
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </FormField>
            <FormField label={t("Желаемая дата визита")}>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  className="field-control pl-10"
                  value={desiredDate}
                  onChange={(e) => setDesiredDate(e.target.value)}
                />
              </div>
            </FormField>
          </div>

          <FormField label={t("Описание проблемы *")} className="mt-4">
            <textarea
              required
              rows={4}
              className="field-control min-h-28 resize-y py-3"
              placeholder={t("Что произошло, какие индикаторы горят, когда появилась проблема?")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>

          <FormField label={t("Адрес или объект *")} className="mt-4">
            <input
              required
              className="field-control"
              placeholder={t("Клиника, город, улица")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </FormField>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField label={t("Контактное лицо *")}>
              <input
                required
                className="field-control"
                placeholder={t("Имя")}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </FormField>
            <FormField label={t("Телефон *")}>
              <input
                required
                className="field-control"
                placeholder="+996 555 00 00 00"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </FormField>
          </div>

          {authenticated && (ordersQuery.data?.length ?? 0) > 0 ? (
            <FormField
              label={t("Связать с заказом (необязательно)")}
              className="mt-4"
            >
              <select
                className="field-control"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              >
                <option value="">{t("Без привязки")}</option>
                {(ordersQuery.data ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id.slice(0, 8)}… · {o.status} · {o.items_count} поз.
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}

          <div className="mt-4">
            <label
              htmlFor="service-photos"
              className="mb-1.5 block text-xs font-semibold"
            >
              Фото ({photos.length}/{MAX_SERVICE_PHOTOS})
            </label>
            {photos.length > 0 ? (
              <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {photos.map((photo) => (
                  <li
                    key={photo.id}
                    className="relative aspect-square overflow-hidden rounded-xl border border-border"
                  >
                    <img
                      src={photo.previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      aria-label={t("Удалить фото")}
                      className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"
                      onClick={() => removePhoto(photo.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {photos.length < MAX_SERVICE_PHOTOS ? (
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-background px-4 py-4 text-xs text-muted-foreground transition hover:border-primary/50">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <FileUp className="h-5 w-5" />
                </span>
                <span>
                  <b className="block text-foreground">{t("Добавить фото")}</b>
                  До {MAX_SERVICE_PHOTOS} файлов, JPG или PNG, до 5 МБ
                </span>
                <input
                  id="service-photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    onPickPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            ) : null}
          </div>

          <Button
            type="submit"
            className="mt-5 h-12 w-full"
            disabled={submitting}
          >
            {submitting ? t("Отправляем…") : t("Отправить заявку")}
            {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
          <p className="mt-3 text-center text-[10px] leading-4 text-muted-foreground">
            {authenticated
              ? t("После отправки заявка появится в списке сервисных заявок.")
              : t("Для отправки заявки потребуется вход в аккаунт.")}
          </p>
        </form>
      </section>
    </AppShell>
  );
}
