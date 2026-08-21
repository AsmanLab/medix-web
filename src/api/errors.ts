import { translate } from "@/i18n/dictionaries";
import { getLocale } from "@/i18n/locale-store";

/**
 * Сеть — вне дерева React: запрос может уйти до первой отрисовки компонента
 * (а то и вовсе из воркера уведомлений), поэтому здесь нет и не может быть
 * `useT()`. Текущий язык читается напрямую из хранилища — того же самого,
 * что и `api/client.ts` использует для `?lang=`.
 */
function t(source: string, values?: Record<string, string | number>): string {
  return translate(getLocale(), source, values);
}

export type AppError = {
  status?: number;
  code?: string;
  message: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
  retryable?: boolean;
  /** Секунды до конца окна rate limit — из заголовка Retry-After при 429. */
  retryAfter?: number;
  cause?: unknown;
};

type BackendErrorBody = {
  detail?: unknown;
  message?: string;
  code?: string;
  error?: string;
  request_id?: string;
  errors?: Record<string, string[] | string>;
};

function fieldErrorsFromDetail(
  detail: unknown,
): Record<string, string> | undefined {
  if (!Array.isArray(detail)) return undefined;
  const out: Record<string, string> = {};
  for (const item of detail) {
    if (
      item &&
      typeof item === "object" &&
      "loc" in item &&
      "msg" in item &&
      Array.isArray((item as { loc: unknown }).loc)
    ) {
      const loc = (item as { loc: unknown[]; msg: string }).loc;
      const key =
        loc.filter((p) => p !== "body" && p !== "query").join(".") || "form";
      out[key] = (item as { msg: string }).msg;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function messageFromDetail(detail: unknown): string | undefined {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0] && typeof detail[0] === "object") {
    const first = detail[0] as { msg?: string };
    return first.msg;
  }
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: unknown }).message);
  }
  return undefined;
}

export function isAppError(value: unknown): value is AppError {
  return (
    !!value &&
    typeof value === "object" &&
    "message" in value &&
    typeof (value as AppError).message === "string"
  );
}

export function toAppError(
  input: unknown,
  fallback = t("Неизвестная ошибка"),
): AppError {
  if (isAppError(input)) return input;
  if (input instanceof Error) {
    return { message: input.message || fallback, cause: input };
  }
  return { message: fallback, cause: input };
}

export async function normalizeResponseError(
  response: Response,
): Promise<AppError> {
  const requestId =
    response.headers.get("x-request-id") ??
    response.headers.get("x-correlation-id") ??
    undefined;

  let body: BackendErrorBody | null = null;
  try {
    body = (await response.json()) as BackendErrorBody;
  } catch {
    body = null;
  }

  const fieldErrors =
    (body?.errors
      ? Object.fromEntries(
          Object.entries(body.errors).map(([k, v]) => [
            k,
            Array.isArray(v) ? (v[0] ?? "") : v,
          ]),
        )
      : undefined) ?? fieldErrorsFromDetail(body?.detail);

  const message =
    messageFromDetail(body?.detail) ??
    body?.message ??
    body?.error ??
    defaultMessageForStatus(response.status);

  return {
    status: response.status,
    code: body?.code,
    message,
    fieldErrors,
    requestId: body?.request_id ?? requestId,
    retryable: response.status >= 500 || response.status === 429,
    retryAfter: retryAfterSeconds(response),
  };
}

/** Retry-After отдаётся сервером при 429 — по нему клиент ведёт обратный отсчёт. */
function retryAfterSeconds(response: Response): number | undefined {
  const raw = response.headers.get("retry-after");
  if (!raw) return undefined;
  const seconds = Number.parseInt(raw, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return t("Некорректный запрос");
    case 401:
      return t("Требуется вход");
    case 403:
      return t("Недостаточно прав");
    case 404:
      return t("Не найдено");
    case 409:
      return t("Конфликт данных");
    case 422:
      return t("Ошибка валидации");
    case 429:
      return t("Слишком много попыток. Попробуйте позже");
    default:
      if (status >= 500) return t("Ошибка сервера. Попробуйте позже");
      return t("Ошибка запроса ({status})", { status });
  }
}
