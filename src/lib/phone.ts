/** Phone helpers for medix-core `996XXXXXXXXX` contract. */

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("996")) return digits;
  if (digits.length === 9) return `996${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) {
    return `996${digits.slice(1)}`;
  }
  return digits;
}

export function isValidKgPhone(phone: string): boolean {
  return /^996\d{9}$/.test(phone);
}

export function formatPhoneDisplay(phone: string): string {
  const n = normalizePhone(phone);
  if (!isValidKgPhone(n)) return phone;
  return `+${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 8)} ${n.slice(8, 10)} ${n.slice(10)}`;
}
