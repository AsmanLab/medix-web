/**
 * Сохранение прогресса подтверждения номера между перезагрузками страницы.
 *
 * Флоу сделали трёхшаговым именно потому, что между отправкой SMS и вводом
 * кода пользователь уходит в приложение сообщений: на вебе он возвращается
 * обновлением страницы, на Android вкладку может выгрузить система. Пока
 * состояние жило только в useState, возврат сбрасывал экран на первый шаг
 * и требовал новой SMS — то есть ровно то, ради устранения чего флоу
 * и переделывали.
 *
 * Пароля здесь нет и быть не должно: он спрашивается последним шагом как раз
 * для того, чтобы не попадать в хранилище. Восстанавливаем только то, что уже
 * и так выдал сервер.
 *
 * sessionStorage, а не localStorage: тикет — это одноразовый пропуск
 * на завершение регистрации или сброса пароля, ему незачем переживать
 * закрытие вкладки и утекать в соседние.
 */

export const OTP_FLOW_KEYS = {
  registration: "medix.otp-flow.registration",
  passwordReset: "medix.otp-flow.password-reset",
} as const;

export type OtpFlowState = {
  step: 2 | 3;
  phone: string;
  transactionId: string;
  /** Пусто на шаге 2 — тикет выдаётся только после verify-otp. */
  ticket: string;
  /** epoch ms. Истёк — шаг 3 недостижим, восстанавливать нечего. */
  ticketExpiresAt: number | null;
  /** epoch ms, конец кулдауна «Отправить снова». */
  cooldownUntil: number | null;
  /** epoch ms, срок действия самого кода. */
  codeExpiresAt: number | null;
};

function isValid(value: unknown): value is OtpFlowState {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Partial<OtpFlowState>;
  if (s.step !== 2 && s.step !== 3) return false;
  if (typeof s.phone !== "string" || !s.phone) return false;
  if (typeof s.transactionId !== "string") return false;
  if (typeof s.ticket !== "string") return false;
  // На третьем шаге без тикета делать нечего: форма отправит пустую строку
  // и получит отказ.
  if (s.step === 3 && !s.ticket) return false;
  return true;
}

export function loadOtpFlow(key: string): OtpFlowState | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(key);
  } catch {
    // Приватный режим и заблокированное хранилище — не повод падать,
    // просто начинаем с первого шага.
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearOtpFlow(key);
    return null;
  }
  if (!isValid(parsed)) {
    clearOtpFlow(key);
    return null;
  }
  if (parsed.ticketExpiresAt !== null && parsed.ticketExpiresAt <= Date.now()) {
    clearOtpFlow(key);
    return null;
  }
  return parsed;
}

export function saveOtpFlow(key: string, state: OtpFlowState): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Не сохранили — пользователь просто потеряет прогресс при перезагрузке.
  }
}

export function clearOtpFlow(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // см. выше
  }
}

/** Остаток кулдауна в секундах из сохранённого дедлайна. */
export function cooldownLeft(cooldownUntil: number | null): number {
  if (cooldownUntil === null) return 0;
  return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
}
