import { getApiBaseUrl } from "@/app/env";
import { normalizeResponseError, type AppError } from "@/api/errors";
import { translate } from "@/i18n/dictionaries";
import { getLocale } from "@/i18n/locale-store";

/** Вне React, как и api/errors.ts — язык читается из общего хранилища. */
function t(source: string): string {
  return translate(getLocale(), source);
}

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
  /** Мс до принудительной отмены запроса. По умолчанию — `DEFAULT_TIMEOUT_MS`. */
  timeoutMs?: number;
};

/**
 * `fetch` без `signal` может зависнуть навсегда, если TCP-соединение
 * тихо оборвалось (например nginx на проде держит upstream по устаревшему
 * IP контейнера) — сервер не отвечает ни успехом, ни ошибкой. Без таймаута
 * это выглядело как «кнопка навсегда заблокирована, помогает только
 * перезагрузка страницы»: мутация, ждущая такой запрос, никогда не
 * переходит из pending в error.
 */
const DEFAULT_TIMEOUT_MS = 20_000;

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
  // На проде base относительный ("/api/v1" — см. app/env.ts), поэтому URL
  // резолвится относительно текущего origin; для абсолютного base (локальная
  // разработка) переданный origin игнорируется — new URL так и работает.
  const url = new URL(`${base}${normalizedPath}`, window.location.origin);
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
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  // Один контроллер на весь вызов (включая повтор после 401) — не по
  // одному таймеру на попытку, иначе первая попытка могла бы отъедать
  // весь бюджет и на повтор с новым токеном времени бы не осталось.
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", onExternalAbort);
  }
  const timeoutError = new DOMException(
    t("Превышено время ожидания ответа сервера"),
    "TimeoutError",
  );
  const timer = setTimeout(() => controller.abort(timeoutError), timeoutMs);

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
      signal: controller.signal,
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
    // Не через toAppError(): у DOMException/TypeError есть строковое
    // `.message`, поэтому isAppError() внутри toAppError принимает их за
    // уже нормализованную ошибку и возвращает как есть — сырое сообщение
    // браузера вместо перевода ниже.
    //
    // Проверка по `.name`, а не `instanceof DOMException`: у abort-ошибки,
    // которую бросает нативный AbortController, и у класса `DOMException`
    // в текущей глобальной области могут быть разные реализации (это не
    // гипотетика — именно так и выходит под jsdom в тестах), и `instanceof`
    // между ними тихо не совпадает.
    const name = (error as { name?: unknown } | null)?.name;
    if (name === "TimeoutError") {
      throw {
        message: t("Превышено время ожидания ответа сервера"),
        cause: error,
      } satisfies AppError;
    }
    if (name === "AbortError") {
      throw { message: t("Запрос отменён"), cause: error } satisfies AppError;
    }
    // Тот же обход toAppError: сетевой сбой обычно приходит как TypeError
    // ("Failed to fetch"), а у него тоже есть строковое `.message` —
    // без обхода пользователь увидел бы этот сырой текст вместо перевода.
    throw { message: t("Не удалось выполнить запрос"), cause: error } satisfies AppError;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}
