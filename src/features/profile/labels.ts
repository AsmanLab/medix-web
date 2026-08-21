import { identityTranslate, type Translate } from "@/i18n/dictionaries";

/** См. features/rfq/status.ts — тот же приём для меток статусов. */
const identity = identityTranslate;

export type VerificationStatus =
  | "unverified"
  | "pending_verification"
  | "pending"
  | "verified"
  | "rejected"
  | string;

export type ClientType =
  | "clinic"
  | "laboratory"
  | "hospital"
  | "individual"
  | "procurement"
  | string;

export function verificationLabel(
  status: VerificationStatus,
  t: Translate = identity,
): string {
  switch (status) {
    case "verified":
      return t("Проверен");
    case "pending_verification":
    case "pending":
      return t("На проверке");
    case "rejected":
      return t("Отклонён");
    case "unverified":
      return t("Не подтверждён");
    default:
      return status;
  }
}

export function isVerified(status: VerificationStatus): boolean {
  return status === "verified";
}

function verificationFieldLabels(t: Translate): Record<string, string> {
  return {
    full_name: t("ФИО контактного лица"),
    organization: t("название организации"),
    city: t("город"),
    address: t("адрес"),
  };
}

export function verificationFieldsLabel(
  fields: string[],
  t: Translate = identity,
): string {
  const labels = verificationFieldLabels(t);
  return fields
    .map((f) => labels[f] ?? f)
    .join(", ")
    .toLowerCase();
}

export type VerificationBanner = {
  tone: "warning" | "danger";
  title: string;
  body: string;
  cta: string;
};

/**
 * Что показать клиенту в профиле. Раньше баннер во всех непроверенных
 * статусах говорил одно и то же: «Проверка организации» — и в статусе
 * unverified это было обещанием проверки, которой никто не начинал.
 */
export function verificationBanner(
  status: VerificationStatus,
  missing: string[] = [],
  t: Translate = identity,
): VerificationBanner | null {
  if (status === "verified") return null;

  if (status === "rejected") {
    return {
      tone: "danger",
      title: t("Верификация отклонена"),
      body: missing.length
        ? t(
            "Менеджер отклонил заявку. Дополните данные ({fields}) и сохраните — заявка уйдёт на проверку заново.",
            { fields: verificationFieldsLabel(missing, t) },
          )
        : t(
            "Менеджер отклонил заявку. Проверьте данные организации и сохраните их заново — заявка уйдёт на проверку повторно.",
          ),
      cta: t("Исправить данные организации →"),
    };
  }

  if (status === "pending_verification" || status === "pending") {
    return {
      tone: "warning",
      title: t("Проверка организации"),
      body: t(
        "Заявка у менеджера. Пока проверка не завершена, доступны запросы цены (RFQ). Прямой заказ откроется после подтверждения — обычно это занимает 1–2 рабочих дня.",
      ),
      cta: t("Проверить данные организации →"),
    };
  }

  return {
    tone: "warning",
    title: t("Данные организации"),
    body: missing.length
      ? t(
          "Заполните {fields} — и заявка уйдёт менеджеру на проверку. До подтверждения доступны запросы цены (RFQ), прямой заказ откроется после.",
          { fields: verificationFieldsLabel(missing, t) },
        )
      : t(
          "Сохраните данные организации — и заявка уйдёт менеджеру на проверку. До подтверждения доступны запросы цены (RFQ), прямой заказ откроется после.",
        ),
    cta: t("Заполнить данные организации →"),
  };
}

export function clientTypeOptions(
  t: Translate = identity,
): { value: ClientType; label: string }[] {
  return [
    { value: "clinic", label: t("Клиника") },
    { value: "laboratory", label: t("Лаборатория") },
    { value: "hospital", label: t("Больница") },
    { value: "individual", label: t("Физлицо / ИП") },
    { value: "procurement", label: t("Закупки / тендер") },
  ];
}

export function clientTypeLabel(
  value: ClientType,
  t: Translate = identity,
): string {
  return clientTypeOptions(t).find((o) => o.value === value)?.label ?? value;
}

export function profileInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export const LAST_PHONE_KEY = "medix.last_phone.v1";

export function readLastPhone(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(LAST_PHONE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeLastPhone(phone: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_PHONE_KEY, phone);
  } catch {
    // ignore
  }
}
