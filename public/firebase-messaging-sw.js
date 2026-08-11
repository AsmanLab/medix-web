/*
 * Service worker для push-уведомлений в браузере.
 *
 * Лежит в public/ и отдаётся как есть, без сборки, поэтому переменные Vite
 * здесь недоступны — конфигурация приходит query-строкой при регистрации
 * (см. registerServiceWorker в src/lib/push.ts). Это документированный
 * приём Firebase для случая, когда конфиг не хочется зашивать в файл.
 *
 * Скрипты грузятся с gstatic.com: собрать SDK в этот файл нельзя, он вне
 * сборки. Для этого пути в vercel.json ослаблен CSP — только для него,
 * страницы сайта остаются со строгим script-src 'self'.
 *
 * Там же этому файлу снят годовой immutable-кэш, который иначе достался бы
 * ему по правилу для *.js: обновления service worker'а перестали бы доходить
 * до браузеров. Правило стоит в vercel.json последним — Vercel применяет все
 * совпавшие, и при одинаковом ключе побеждает последнее. Комментарий живёт
 * здесь, а не рядом с правилом: в блоке headers Vercel не разрешает
 * посторонних полей и отклоняет весь деплой.
 *
 * Версия SDK зафиксирована намеренно: «latest» в service worker'е означает,
 * что поведение может измениться без нашего выката.
 */

/* eslint-env serviceworker */
/* global importScripts, firebase, clients */

importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js",
);

const params = new URL(self.location).searchParams;

const config = {
  apiKey: params.get("apiKey"),
  projectId: params.get("projectId"),
  appId: params.get("appId"),
  messagingSenderId: params.get("messagingSenderId"),
};

// Без конфигурации SW просто ничего не делает: так он ведёт себя у клиентов,
// которые открыли сайт до того, как заказчик завёл проект Firebase.
if (
  config.apiKey &&
  config.projectId &&
  config.appId &&
  config.messagingSenderId
) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || "Medix";
    const deepLink = payload.data?.deep_link || "";

    self.registration.showNotification(title, {
      body: payload.notification?.body || "",
      icon: "/favicon.svg",
      // tag по ссылке: повторное уведомление о той же сделке заменяет
      // предыдущее, а не копится стопкой.
      tag: deepLink || "medix",
      data: { deepLink },
    });
  });
}

/*
 * deep_link с сервера — не URL, а короткий адрес вида «rfq/<id>».
 * Маршрут витрины называется иначе, поэтому его нужно собрать.
 *
 * Копия таблицы из src/features/notifications/deep-link.ts: сюда её не
 * импортировать — файл отдаётся как есть, без сборки. При добавлении нового
 * адреса менять надо оба места, иначе клик по уведомлению уведёт в 404.
 */
const ROUTES = [
  ["admin/rfq/", "/admin/commerce/"],
  ["admin/orders/", "/admin/orders/"],
  ["admin/service/", "/admin/service-desk/"],
  ["admin/customers/", "/admin/users/"],
  ["order/", "/orders/"],
  ["rfq/", "/requests/"],
  ["service/", "/service/requests/"],
];

function routeForDeepLink(raw) {
  const cleaned = String(raw || "").replace(/^\/+/, "");
  if (!cleaned) return "/";
  if (cleaned === "profile") return "/profile";

  for (const [prefix, route] of ROUTES) {
    if (!cleaned.startsWith(prefix)) continue;
    const id = cleaned.slice(prefix.length);
    // Пустой хвост — ссылка битая: ведём в центр уведомлений, а не в 404.
    return id ? route + encodeURIComponent(id) : "/notifications";
  }
  return "/";
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL(
    routeForDeepLink(event.notification.data?.deepLink),
    self.location.origin,
  ).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Если вкладка с сайтом уже открыта — переиспользуем её, а не плодим
        // новые при каждом уведомлении.
        for (const client of windowClients) {
          if (
            client.url.startsWith(self.location.origin) &&
            "focus" in client
          ) {
            client.navigate(target);
            return client.focus();
          }
        }
        return clients.openWindow(target);
      }),
  );
});
