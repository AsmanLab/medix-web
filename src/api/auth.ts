import type { components } from "@/api/generated/openapi";
import { apiRequest } from "@/api/client";

export type TokenResponse = components["schemas"]["TokenResponse"];
export type SendOtpResponse = components["schemas"]["SendOtpResponse"];
export type OtpPurpose = "registration" | "password_reset";

export type VerifyOtpResponse = {
  ticket: string;
  expires_at: string;
};

/** Шаг 1: отправка кода. Возвращает ключ транзакции для шага verify. */
export function sendOtp(phone: string, purpose: OtpPurpose) {
  return apiRequest<SendOtpResponse>({
    method: "POST",
    path: "/auth/send-otp",
    body: { phone, purpose },
    retryOnUnauthorized: false,
  });
}

/**
 * Шаг 2: подтверждение кода. Аккаунт ещё не создаётся — в ответ приходит
 * одноразовый тикет, по которому завершается регистрация или сброс пароля.
 */
export function verifyOtp(input: {
  transaction_id: string;
  otp_code: string;
  purpose: OtpPurpose;
}) {
  return apiRequest<VerifyOtpResponse>({
    method: "POST",
    path: "/auth/verify-otp",
    body: input,
    retryOnUnauthorized: false,
  });
}

/** Шаг 3: создание аккаунта. Телефон берётся из тикета, клиент его не шлёт. */
export function register(input: {
  registration_ticket: string;
  password: string;
  full_name: string;
  pd_consent: boolean;
}) {
  return apiRequest<TokenResponse>({
    method: "POST",
    path: "/auth/register",
    body: input,
    retryOnUnauthorized: false,
  });
}

export function login(phone: string, password: string) {
  return apiRequest<TokenResponse>({
    method: "POST",
    path: "/auth/login",
    body: { phone, password },
    retryOnUnauthorized: false,
  });
}

export function refresh(refreshToken: string) {
  return apiRequest<TokenResponse>({
    method: "POST",
    path: "/auth/refresh",
    body: { refresh_token: refreshToken },
    retryOnUnauthorized: false,
  });
}

export function logout(refreshToken: string) {
  return apiRequest<void>({
    method: "POST",
    path: "/auth/logout",
    body: { refresh_token: refreshToken },
    retryOnUnauthorized: false,
  });
}

/**
 * Шаг 1 сброса пароля — тот же send-otp с purpose="password_reset".
 * Отдельный /auth/password-reset убран: он отвечал 204 без transaction_id,
 * а без ключа шаг verify-otp недостижим.
 */
export function requestPasswordReset(phone: string) {
  return sendOtp(phone, "password_reset");
}

/** Шаг 3 сброса: номер берётся из тикета, полученного на verify-otp. */
export function confirmPasswordReset(input: {
  reset_ticket: string;
  new_password: string;
}) {
  return apiRequest<void>({
    method: "POST",
    path: "/auth/password-reset/confirm",
    body: input,
    retryOnUnauthorized: false,
  });
}
