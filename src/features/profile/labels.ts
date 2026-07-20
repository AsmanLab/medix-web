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

export function needsVerificationBanner(status: VerificationStatus): boolean {
  return status !== "verified";
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
