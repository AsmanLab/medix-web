/**
 * Session contract + store.
 *
 * Security note (ADR-002, реализовано):
 * - access_token: только в памяти;
 * - refresh_token: HttpOnly; Secure; SameSite=Lax cookie — фронту недоступен
 *   даже через XSS, сервер сам ставит/снимает её на /auth/*.
 * Не-HttpOnly cookie-метка `medix_session` (см. `hasSessionMarker`) нужна
 * только чтобы не дёргать /auth/refresh у анонимного посетителя витрины.
 */

import { useSyncExternalStore } from "react";
import * as authApi from "@/api/auth";
import {
  setAccessTokenGetter,
  setAccessTokenRefreshHandler,
} from "@/api/client";
import { isAppError } from "@/api/errors";
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

/** Устаревший ключ sessionStorage (до перехода на HttpOnly-cookie, ADR-002).
 * Оставлен только для одноразовой чистки у уже установленных PWA. */
const LEGACY_REFRESH_KEY = "medix.refresh_token.v1";

type Listener = () => void;

let state: SessionState = { ...initialSessionState, status: "bootstrapping" };
const listeners = new Set<Listener>();

/**
 * Единственный promise на обновление токена — общий для bootstrap и для
 * повтора после 401 из api/client.ts. Раньше это были два независимых
 * single-flight'а (`bootstrapPromise` здесь и `refreshPromise` в client.ts),
 * и на холодном старте PWA они параллельно обменивали один и тот же
 * refresh-токен: один запрос успевал первым и получал новую пару, второй
 * бил по уже провёрнутому токену и разлогинивал победителя гонки.
 */
let refreshPromise: Promise<SessionState> | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function setState(patch: Partial<SessionState>) {
  state = { ...state, ...patch };
  emit();
}

/** Не-HttpOnly метка, которую ставит сервер вместе с refresh-cookie. Сама
 * cookie фронту не видна — только по этому флагу и решаем, стоит ли вообще
 * пытаться /auth/refresh. */
function hasSessionMarker(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("medix_session=1");
}

function cleanupLegacyRefreshToken() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(LEGACY_REFRESH_KEY);
  } catch {
    // ignore quota / private mode
  }
}

function applyTokens(accessToken: string) {
  const claims = decodeAccessToken(accessToken);
  if (!claims) {
    clearSessionLocal();
    return;
  }
  const wasAnonymous = state.status !== "authenticated";
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
  cleanupLegacyRefreshToken();
  setState({
    status: "anonymous",
    accessToken: null,
    user: null,
  });
}

/** 401/403 — сервер явно сказал, что сессии нет: чистим локально.
 * Всё остальное (сетевой сбой, таймаут, 429, 5xx) — не повод разлогинивать:
 * cookie на сервере жива, следующая попытка (фокус на вкладку) дособерёт
 * сессию сама. */
function isDefiniteSessionLoss(error: unknown): boolean {
  return isAppError(error) && (error.status === 401 || error.status === 403);
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

/** Общий single-flight обмена refresh-токена: и холодный старт (bootstrap),
 * и повтор после 401 из api/client.ts идут через один и тот же promise. */
function runRefresh(): Promise<SessionState> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const tokens = await authApi.refresh();
      applyTokens(tokens.access_token);
    } catch (error) {
      if (isDefiniteSessionLoss(error)) {
        clearSessionLocal();
      }
      // сетевой сбой/таймаут/5xx/429 — состояние не трогаем
    }
    return state;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function bootstrapSession(): Promise<SessionState> {
  if (state.status === "authenticated") return state;

  if (!hasSessionMarker()) {
    setState({ status: "anonymous", accessToken: null, user: null });
    return state;
  }

  return runRefresh();
}

export async function loginWithPassword(phone: string, password: string) {
  const tokens = await authApi.login(phone, password);
  applyTokens(tokens.access_token);
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
  applyTokens(tokens.access_token);
  writeLastPhone(phone);
  return getSessionSnapshot();
}

export async function logoutSession(queryClient?: { clear?: () => void }) {
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
    await authApi.logout();
  } catch {
    // still clear local session
  }
  clearSessionLocal();
  queryClient?.clear?.();
}

async function refreshAccessToken(): Promise<string | null> {
  const next = await runRefresh();
  return next.status === "authenticated" ? next.accessToken : null;
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
