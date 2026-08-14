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

export function verificationLabel(status: VerificationStatus): string {
  switch (status) {
    case "verified":
      return "Проверен";
    case "pending_verification":
    case "pending":
      return "На проверке";
    case "rejected":
      return "Отклонён";
    case "unverified":
      return "Не подтверждён";
    default:
      return status;
  }
}

export function isVerified(status: VerificationStatus): boolean {
  return status === "verified";
}

export const VERIFICATION_FIELD_LABELS: Record<string, string> = {
  full_name: "ФИО контактного лица",
  organization: "название организации",
  city: "город",
  address: "адрес",
};

export function verificationFieldsLabel(fields: string[]): string {
  return fields
    .map((f) => VERIFICATION_FIELD_LABELS[f] ?? f)
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
): VerificationBanner | null {
  if (status === "verified") return null;

  if (status === "rejected") {
    return {
      tone: "danger",
      title: "Верификация отклонена",
      body: missing.length
        ? `Менеджер отклонил заявку. Дополните данные (${verificationFieldsLabel(missing)}) и сохраните — заявка уйдёт на проверку заново.`
        : "Менеджер отклонил заявку. Проверьте данные организации и сохраните их заново — заявка уйдёт на проверку повторно.",
      cta: "Исправить данные организации →",
    };
  }

  if (status === "pending_verification" || status === "pending") {
    return {
      tone: "warning",
      title: "Проверка организации",
      body: "Заявка у менеджера. Пока проверка не завершена, доступны запросы цены (RFQ). Прямой заказ откроется после подтверждения — обычно это занимает 1–2 рабочих дня.",
      cta: "Проверить данные организации →",
    };
  }

  return {
    tone: "warning",
    title: "Данные организации",
    body: missing.length
      ? `Заполните ${verificationFieldsLabel(missing)} — и заявка уйдёт менеджеру на проверку. До подтверждения доступны запросы цены (RFQ), прямой заказ откроется после.`
      : "Сохраните данные организации — и заявка уйдёт менеджеру на проверку. До подтверждения доступны запросы цены (RFQ), прямой заказ откроется после.",
    cta: "Заполнить данные организации →",
  };
}

export const CLIENT_TYPE_OPTIONS: { value: ClientType; label: string }[] = [
  { value: "clinic", label: "Клиника" },
  { value: "laboratory", label: "Лаборатория" },
  { value: "hospital", label: "Больница" },
  { value: "individual", label: "Физлицо / ИП" },
  { value: "procurement", label: "Закупки / тендер" },
];

export function clientTypeLabel(value: ClientType): string {
  return CLIENT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
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
