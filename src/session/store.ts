/**
 * Session contract + store.
 *
 * Security note (temporary exception until HttpOnly cookie auth):
 * - access_token: in-memory only
 * - refresh_token: sessionStorage (XSS-accessible; not "secure storage")
 * Documented in docs/UI_DECISIONS.md — remove when backend supports cookies.
 */

import { useSyncExternalStore } from "react";
import * as authApi from "@/api/auth";
import {
  setAccessTokenGetter,
  setAccessTokenRefreshHandler,
} from "@/api/client";
import { writeLastPhone } from "@/features/profile/labels";
import { decodeAccessToken } from "@/lib/jwt";
import {
  initialSessionState,
  type SessionState,
  type SessionUser,
  type UserRole,
} from "@/session/roles";

export {
  landingPathForRole,
  type SessionState,
  type SessionUser,
  type UserRole,
} from "@/session/roles";

const REFRESH_KEY = "medix.refresh_token.v1";

type Listener = () => void;

let state: SessionState = { ...initialSessionState, status: "bootstrapping" };
const listeners = new Set<Listener>();
let bootstrapPromise: Promise<SessionState> | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function setState(patch: Partial<SessionState>) {
  state = { ...state, ...patch };
  emit();
}

function readRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

function writeRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.sessionStorage.setItem(REFRESH_KEY, token);
    else window.sessionStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore quota / private mode
  }
}

function applyTokens(accessToken: string, refreshToken: string) {
  const claims = decodeAccessToken(accessToken);
  if (!claims) {
    clearSessionLocal();
    return;
  }
  const wasAnonymous = state.status !== "authenticated";
  writeRefreshToken(refreshToken);
  setState({
    status: "authenticated",
    accessToken,
    user: { userId: claims.userId, role: claims.role },
  });

  // Только на переходе в авторизованное состояние: applyTokens вызывается
  // ещё и при обновлении access-токена каждые 15 минут, а перевыпускать
  // подписку по таймеру незачем.
  if (wasAnonymous) void resumePush();
}

/**
 * Восстанавливает подписку на push, снятую при прошлом выходе.
 *
 * Ошибки проглатываются здесь же: подписка не должна мешать входу, а при
 * неудаче в профиле остаётся обычная кнопка включения.
 */
async function resumePush() {
  try {
    const { resumePushOnLogin } = await import("@/lib/push");
    await resumePushOnLogin();
  } catch {
    // push не настроен или браузер не умеет — это штатно
  }
}

function clearSessionLocal() {
  writeRefreshToken(null);
  setState({
    status: "anonymous",
    accessToken: null,
    user: null,
  });
}

export function getSessionSnapshot(): SessionState {
  return state;
}

export function getAccessToken(): string | null {
  return state.accessToken;
}

export function subscribeSession(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribeSession, getSessionSnapshot, () => ({
    ...initialSessionState,
    status: "bootstrapping",
  }));
}

export async function bootstrapSession(): Promise<SessionState> {
  if (state.status === "authenticated") return state;
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    const stored = readRefreshToken();
    if (!stored) {
      setState({ status: "anonymous", accessToken: null, user: null });
      return state;
    }

    try {
      const tokens = await authApi.refresh(stored);
      applyTokens(tokens.access_token, tokens.refresh_token);
    } catch {
      clearSessionLocal();
    }
    return state;
  })().finally(() => {
    bootstrapPromise = null;
  });

  return bootstrapPromise;
}

export async function loginWithPassword(phone: string, password: string) {
  const tokens = await authApi.login(phone, password);
  applyTokens(tokens.access_token, tokens.refresh_token);
  writeLastPhone(phone);
  return getSessionSnapshot();
}

export async function registerWithTicket(input: {
  registration_ticket: string;
  password: string;
  full_name: string;
  pd_consent: boolean;
  /** Только для запоминания последнего номера в форме входа. */
  phone: string;
}) {
  const { phone, ...body } = input;
  const tokens = await authApi.register(body);
  applyTokens(tokens.access_token, tokens.refresh_token);
  writeLastPhone(phone);
  return getSessionSnapshot();
}

export async function logoutSession(queryClient?: { clear?: () => void }) {
  const refreshToken = readRefreshToken();

  // Подписку на push снимаем до выхода, пока токен доступа ещё жив:
  // токен браузера один на всех, кто им пользуется, а получателя определяет
  // привязка на сервере — без этого на общем компьютере уведомления
  // прошлого клиента приходили бы следующему.
  try {
    const { unregisterPushOnLogout } = await import("@/lib/push");
    await unregisterPushOnLogout();
  } catch {
    // выход важнее отписки
  }

  try {
    if (refreshToken) await authApi.logout(refreshToken);
  } catch {
    // still clear local session
  }
  clearSessionLocal();
  queryClient?.clear?.();
}

async function refreshAccessToken(): Promise<string | null> {
  const stored = readRefreshToken();
  if (!stored) {
    clearSessionLocal();
    return null;
  }
  try {
    const tokens = await authApi.refresh(stored);
    applyTokens(tokens.access_token, tokens.refresh_token);
    return tokens.access_token;
  } catch {
    clearSessionLocal();
    return null;
  }
}

/** Wire API client token getter + single-flight refresh. Safe to call multiple times. */
export function bindSessionToApiClient() {
  setAccessTokenGetter(() => state.accessToken);
  setAccessTokenRefreshHandler(refreshAccessToken);
}

// Bind immediately so beforeLoad/bootstrap and first queries see the token getter.
bindSessionToApiClient();

export function hasRole(user: SessionUser | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
