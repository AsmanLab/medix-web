import { getApiBaseUrl } from "@/app/env";
import {
  normalizeResponseError,
  toAppError,
  type AppError,
} from "@/api/errors";
import { getLocale } from "@/i18n/locale-store";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiRequestOptions = {
  method?: HttpMethod;
  path: string;
  query?: Record<
    string,
    string | number | boolean | undefined | null | readonly string[]
  >;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  /** Skip JSON Content-Type (e.g. FormData). */
  rawBody?: BodyInit | null;
  /** Access token override; otherwise uses session getter. */
  accessToken?: string | null;
  /** When false, do not attempt refresh on 401 (default true). */
  retryOnUnauthorized?: boolean;
  /**
   * Что ждать в ответе. По умолчанию JSON; "blob" нужен экспортам вроде
   * CSV-отчёта — их отдаёт не JSON, и обычный путь вернул бы undefined.
   */
  responseType?: "json" | "blob";
};

type RefreshHandler = () => Promise<string | null>;
type AccessTokenGetter = () => string | null;

let refreshHandler: RefreshHandler | null = null;
let refreshPromise: Promise<string | null> | null = null;
let accessTokenGetter: AccessTokenGetter = () => null;

/** Register single-flight refresh used on 401. */
export function setAccessTokenRefreshHandler(handler: RefreshHandler | null) {
  refreshHandler = handler;
}

/** Register in-memory access token source from session store. */
export function setAccessTokenGetter(getter: AccessTokenGetter) {
  accessTokenGetter = getter;
}

async function singleFlightRefresh(): Promise<string | null> {
  if (!refreshHandler) return null;
  if (!refreshPromise) {
    refreshPromise = refreshHandler().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function buildUrl(path: string, query?: ApiRequestOptions["query"]): string {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);
  // Язык — ко всем запросам без исключения, а не только к каталогу.
  // Ручки, которым он не нужен, лишний параметр игнорируют, а вот
  // перечислять «переводимые» руками означало бы забыть новую.
  url.searchParams.set("lang", getLocale());
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      // Массив разворачивается в повторяющийся параметр (?k=a&k=b) — так
      // FastAPI принимает `list[...]` в Query. `set` здесь бы не подошёл:
      // он оставляет только последнее значение.
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === undefined || item === null) continue;
          url.searchParams.append(key, String(item));
        }
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function apiRequest<T>(options: ApiRequestOptions): Promise<T> {
  const {
    method = "GET",
    path,
    query,
    body,
    headers,
    signal,
    rawBody,
    accessToken,
    retryOnUnauthorized = true,
    responseType = "json",
  } = options;

  const run = async (token: string | null | undefined): Promise<Response> => {
    const hdrs = new Headers(headers);
    if (!hdrs.has("Accept")) hdrs.set("Accept", "application/json");
    if (token) hdrs.set("Authorization", `Bearer ${token}`);

    let requestBody: BodyInit | undefined;
    if (rawBody !== undefined) {
      requestBody = rawBody ?? undefined;
    } else if (body !== undefined) {
      if (!hdrs.has("Content-Type")) {
        hdrs.set("Content-Type", "application/json");
      }
      requestBody = JSON.stringify(body);
    }

    return fetch(buildUrl(path, query), {
      method,
      headers: hdrs,
      body: requestBody,
      signal,
      credentials: "include",
    });
  };

  try {
    const resolvedToken =
      accessToken !== undefined ? accessToken : accessTokenGetter();
    let response = await run(resolvedToken);

    if (response.status === 401 && retryOnUnauthorized && refreshHandler) {
      const nextToken = await singleFlightRefresh();
      if (nextToken) {
        response = await run(nextToken);
      }
    }

    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    if (!response.ok) {
      throw await normalizeResponseError(response);
    }

    if (responseType === "blob") {
      return (await response.blob()) as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if ((error as AppError)?.status) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw toAppError(error, "Запрос отменён");
    }
    throw toAppError(error, "Не удалось выполнить запрос");
  }
}
