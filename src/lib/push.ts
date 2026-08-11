/**
 * Push-уведомления в браузере через Firebase Cloud Messaging.
 *
 * Транспорт тот же, что у мобильного приложения: токен браузера — обычная
 * строка, и уходит в `POST /devices` с `platform: "fcm"`. Отдельный Web Push
 * с VAPID напрямую означал бы вторую библиотеку на бэкенде, вторую таблицу
 * подписок и второй набор ключей у заказчика; здесь всё это делает FCM.
 *
 * SDK подгружается динамически и только в момент, когда пользователь
 * включает уведомления: иначе Firebase (около 40 КБ в gzip) попадал бы
 * в основной бандл ради функции, которой большинство не пользуется.
 */

import { registerDevice, removeDevice } from "@/api/notifications";
import { getEnv } from "@/app/env";

const SW_PATH = "/firebase-messaging-sw.js";
const TOKEN_STORAGE_KEY = "medix.push_token.v1";

export type PushSupport =
  "ready" | "not-configured" | "unsupported" | "denied" | "enabled";

/** Токен последней успешной подписки — чтобы снять её при выходе. */
function readStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // приватный режим — подписка просто не переживёт закрытие вкладки
  }
}

/**
 * Что показывать в интерфейсе.
 *
 * `not-configured` — Firebase не настроен: кнопку показывать не нужно вовсе,
 * иначе пользователь нажмёт и ничего не произойдёт.
 */
export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!getEnv().firebase) return "not-configured";

  // Safari до 16.4 и любой браузер без service worker'ов сюда не проходят.
  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    return "unsupported";
  }
  if (!("PushManager" in window)) return "unsupported";

  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted" && readStoredToken()) {
    return "enabled";
  }
  return "ready";
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const config = getEnv().firebase;
  if (!config) throw new Error("Firebase не настроен");

  // Конфиг уезжает в query-строку: файл лежит в public/ и переменные сборки
  // в нём недоступны. Секретов здесь нет — все пять значений публичные.
  const query = new URLSearchParams({
    apiKey: config.apiKey,
    projectId: config.projectId,
    appId: config.appId,
    messagingSenderId: config.messagingSenderId,
  });

  return navigator.serviceWorker.register(`${SW_PATH}?${query}`, {
    scope: "/",
  });
}

/**
 * Спрашивает разрешение, получает токен и регистрирует устройство.
 *
 * Возвращает текст для пользователя при отказе — вызывающий показывает его
 * тостом. Бросает только на неожиданных ошибках.
 */
export async function enablePush(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  const config = getEnv().firebase;
  if (!config) return { ok: false, reason: "Уведомления не настроены" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      reason:
        permission === "denied"
          ? "Уведомления запрещены в настройках браузера — разрешите их для этого сайта"
          : "Разрешение не выдано",
    };
  }

  const registration = await registerServiceWorker();

  const [{ initializeApp, getApps }, { getMessaging, getToken }] =
    await Promise.all([import("firebase/app"), import("firebase/messaging")]);

  // getApps: повторная инициализация того же приложения бросает исключение,
  // а пользователь может включить и выключить уведомления несколько раз.
  const app = getApps()[0] ?? initializeApp(config);

  const token = await getToken(getMessaging(app), {
    vapidKey: config.vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    return { ok: false, reason: "Браузер не выдал токен уведомлений" };
  }

  await registerDevice({ platform: "fcm", token });
  writeStoredToken(token);
  return { ok: true };
}

/**
 * Отписывает браузер.
 *
 * Разрешение браузера при этом не отзывается — отозвать его может только
 * сам пользователь в настройках сайта. Мы снимаем токен на сервере,
 * поэтому push перестают приходить.
 */
export async function disablePush(): Promise<void> {
  const token = readStoredToken();
  writeStoredToken(null);
  if (!token) return;

  try {
    await removeDevice(token);
  } catch {
    // Токен мог быть снят раньше или протух — для пользователя это всё равно
    // «уведомления выключены».
  }
}

/**
 * Снимает подписку при выходе из аккаунта.
 *
 * Без этого на общем компьютере push следующего клиента продолжали бы
 * приходить предыдущему: токен браузера один, а получателя определяет
 * привязка на сервере.
 */
export async function unregisterPushOnLogout(): Promise<void> {
  await disablePush();
}
