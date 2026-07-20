import type { components } from "@/api/generated/openapi";
import { apiRequest } from "@/api/client";

export type TokenResponse = components["schemas"]["TokenResponse"];
export type SendOtpResponse = components["schemas"]["SendOtpResponse"];
export type OtpPurpose = "registration" | "password_reset";

export function sendOtp(phone: string, purpose: OtpPurpose) {
  return apiRequest<SendOtpResponse>({
    method: "POST",
    path: "/auth/send-otp",
    body: { phone, purpose },
    retryOnUnauthorized: false,
  });
}

export function register(input: {
  phone: string;
  otp_code: string;
  password: string;
  full_name: string;
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

export function requestPasswordReset(phone: string) {
  return apiRequest<void>({
    method: "POST",
    path: "/auth/password-reset",
    body: { phone },
    retryOnUnauthorized: false,
  });
}

export function confirmPasswordReset(input: {
  phone: string;
  otp_code: string;
  new_password: string;
}) {
  return apiRequest<void>({
    method: "POST",
    path: "/auth/password-reset/confirm",
    body: input,
    retryOnUnauthorized: false,
  });
}
