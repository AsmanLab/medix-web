import { z } from "zod";

const envSchema = z.object({
  VITE_PUBLIC_API_BASE_URL: z
    .string()
    .url()
    .default("http://localhost:8000/api/v1"),
});

/**
 * Конфигурация Firebase для web-push.
 *
 * Все значения здесь **публичные** — Google отдаёт их в сниппете веб-приложения
 * и они всё равно видны в собранном бандле. Доступ к отправке даёт не они,
 * а service account на бэкенде, который в браузер не попадает.
 *
 * Пусто = push на витрине выключен. Это рабочее состояние: пока заказчик
 * не завёл проект Firebase, кнопка «Включить уведомления» просто не
 * показывается, и ничего не ломается.
 */
export type FirebaseWebConfig = {
  apiKey: string;
  projectId: string;
  appId: string;
  messagingSenderId: string;
  /** Открытый ключ Web Push из раздела Cloud Messaging. */
  vapidKey: string;
};

export type AppEnv = {
  /** Browser-safe API base including `/api/v1`. */
  publicApiBaseUrl: string;
  /** null, если Firebase не настроен. */
  firebase: FirebaseWebConfig | null;
};

function readViteEnv(): Record<string, string | undefined> {
  try {
    return import.meta.env as Record<string, string | undefined>;
  } catch {
    return {};
  }
}

/**
 * Validates and returns app environment.
 */
export function getEnv(): AppEnv {
  const vite = readViteEnv();
  const publicRaw =
    vite.VITE_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

  const parsed = envSchema.safeParse({
    VITE_PUBLIC_API_BASE_URL: publicRaw.replace(/\/$/, ""),
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid frontend env: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }

  return {
    publicApiBaseUrl: parsed.data.VITE_PUBLIC_API_BASE_URL.replace(/\/$/, ""),
    firebase: readFirebaseConfig(vite),
  };
}

/**
 * Собирает конфигурацию Firebase, только если заполнены **все** пять полей.
 *
 * Частично заполненный конфиг хуже пустого: SDK инициализируется, запрашивает
 * у пользователя разрешение на уведомления и падает уже после этого — человек
 * успевает нажать «Разрешить» и не получить ничего. Поэтому либо всё, либо
 * push просто выключен.
 */
function readFirebaseConfig(
  vite: Record<string, string | undefined>,
): FirebaseWebConfig | null {
  const config = {
    apiKey: vite.VITE_FIREBASE_API_KEY?.trim() ?? "",
    projectId: vite.VITE_FIREBASE_PROJECT_ID?.trim() ?? "",
    appId: vite.VITE_FIREBASE_APP_ID?.trim() ?? "",
    messagingSenderId: vite.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? "",
    vapidKey: vite.VITE_FIREBASE_VAPID_KEY?.trim() ?? "",
  };

  return Object.values(config).every(Boolean) ? config : null;
}

export function getApiBaseUrl(): string {
  return getEnv().publicApiBaseUrl;
}
