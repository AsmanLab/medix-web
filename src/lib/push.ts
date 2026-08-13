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
  | "ready"
  | "not-configured"
  | "unsupported"
  | "needs-install"
  | "denied"
  | "enabled";

/**
 * iPhone или iPad, включая iPad в десктопном режиме.
 *
 * iPadOS с версии 13 представляется как MacIntel, и отличить его от макбука
 * можно только по наличию тач-экрана.
 */
function isIos(): boolean {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** Сайт открыт как приложение с домашнего экрана, а не вкладкой. */
function isStandalone(): boolean {
  const iosStandalone = (navigator as { standalone?: boolean }).standalone;
  return (
    iosStandalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches === true
  );
}

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
 *
 * `needs-install` — iPhone или iPad во вкладке браузера. Apple разрешает
 * Web Push только веб-приложениям с домашнего экрана: во вкладке нет ни
 * PushManager, ни Notification, и включить уведомления нельзя ничем.
 * Раньше блок в этом случае просто исчезал, и выглядело это как поломка —
 * на телефоне кнопки нет ни в Safari, ни в Chrome (на iOS он тот же WebKit).
 */
export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!getEnv().firebase) return "not-configured";

  // Safari до 16.4 и любой браузер без service worker'ов сюда не проходят.
  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    return isIos() && !isStandalone() ? "needs-install" : "unsupported";
  }
  if (!("PushManager" in window)) {
    return isIos() && !isStandalone() ? "needs-install" : "unsupported";
  }

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
 * Берёт токен у Firebase и привязывает его к текущему пользователю.
 *
 * Разрешение к этому моменту уже должно быть выдано: getToken при отсутствии
 * разрешения бросает исключение, а не спрашивает.
 */
async function subscribeCurrentBrowser(): Promise<string | null> {
  const config = getEnv().firebase;
  if (!config) return null;

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

  if (!token) return null;

  await registerDevice({ platform: "fcm", token });
  writeStoredToken(token);
  return token;
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
  if (!getEnv().firebase) {
    return { ok: false, reason: "Уведомления не настроены" };
  }

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

  const token = await subscribeCurrentBrowser();
  if (!token) {
    return { ok: false, reason: "Браузер не выдал токен уведомлений" };
  }
  return { ok: true };
}

/**
 * Возвращает подписку после входа в аккаунт.
 *
 * При выходе подписка снимается на сервере — иначе на общем компьютере push
 * следующего клиента приходили бы предыдущему. Но разрешение браузера при
 * этом остаётся выданным, и человек, включивший уведомления один раз, ждёт,
 * что после следующего входа они продолжат приходить, а не что кнопку надо
 * нажимать заново. Поэтому при входе подписка восстанавливается молча: это
 * та же привязка токена, только уже к тому, кто вошёл сейчас.
 *
 * Ничего не спрашивает и ничего не показывает: если разрешения нет, человек
 * его просто не давал — кнопка в профиле на месте.
 */
export async function resumePushOnLogin(): Promise<void> {
  if (pushSupport() !== "ready") return;
  if (Notification.permission !== "granted") return;

  try {
    await subscribeCurrentBrowser();
  } catch {
    // Вход важнее подписки: при неудаче остаётся кнопка в профиле.
  }
}

export type ForegroundPush = {
  title: string;
  body: string;
  deepLink: string | null;
};

/**
 * Уведомления, пришедшие при открытой вкладке.
 *
 * Пока страница на переднем плане, FCM **не** отдаёт сообщение service
 * worker'у и системного уведомления не показывает: сообщение приходит в саму
 * страницу, и если она его не обрабатывает — не происходит ничего. Из-за
 * этого «уведомления приходят, только когда браузер свёрнут» выглядело как
 * поломка, хотя это документированное поведение.
 *
 * Возвращает функцию отписки. Ничего не делает, если push не настроен или
 * не включён: SDK Firebase тогда не грузится вовсе.
 */
export async function onForegroundPush(
  handler: (message: ForegroundPush) => void,
): Promise<() => void> {
  const config = getEnv().firebase;
  if (!config || pushSupport() !== "enabled") return () => {};

  const [{ initializeApp, getApps }, { getMessaging, onMessage }] =
    await Promise.all([import("firebase/app"), import("firebase/messaging")]);

  const app = getApps()[0] ?? initializeApp(config);

  return onMessage(getMessaging(app), (payload) => {
    const title = payload.notification?.title ?? "Новое уведомление";
    const body = payload.notification?.body ?? "";
    const deepLink =
      (payload.data?.deep_link as string | undefined)?.trim() || null;
    handler({ title, body, deepLink });
  });
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
