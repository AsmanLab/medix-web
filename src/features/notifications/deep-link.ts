/**
 * Разбор `deep_link` уведомления.
 *
 * Сервер кладёт в уведомление не URL, а короткий адрес вида `rfq/<id>`:
 * одно и то же событие открывается по-разному в вебе, в админке и в мобильном
 * приложении. Клиентские адреса ведут в кабинет, служебные начинаются с
 * `admin/` и ведут в панель — например, «Новый запрос КП» открывается
 * менеджеру не как его собственный запрос, а как карточка сделки.
 */

export type DeepLinkTarget =
  | { kind: "order"; id: string }
  | { kind: "rfq"; id: string }
  | { kind: "service"; id: string }
  | { kind: "admin-rfq"; id: string }
  | { kind: "admin-order"; id: string }
  | { kind: "admin-service"; id: string }
  | { kind: "admin-customer"; id: string }
  | { kind: "profile" }
  | null;

/*
 * Второй экземпляр этой таблицы живёт в public/firebase-messaging-sw.js:
 * service worker отдаётся без сборки и импортировать отсюда ничего не может,
 * а по клику на уведомление адрес нужен ему же. Синхронность проверяется
 * тестом deep-link.test.ts.
 */
const PREFIXES = [
  // Служебные идут первыми: `admin/rfq/…` не должен совпасть с `rfq/…`.
  ["admin/rfq/", "admin-rfq"],
  ["admin/orders/", "admin-order"],
  ["admin/service/", "admin-service"],
  ["admin/customers/", "admin-customer"],
  ["order/", "order"],
  ["rfq/", "rfq"],
  ["service/", "service"],
] as const;

export function parseDeepLink(path: string | null | undefined): DeepLinkTarget {
  if (!path) return null;
  const cleaned = path.replace(/^\/+/, "").trim();
  if (!cleaned) return null;
  if (cleaned === "profile") return { kind: "profile" };

  for (const [prefix, kind] of PREFIXES) {
    if (!cleaned.startsWith(prefix)) continue;
    const id = cleaned.slice(prefix.length);
    // Пустой хвост — ссылка битая: навигация по `/admin/commerce/` вместо
    // карточки выкинет в 404, лучше не уводить со страницы вовсе.
    return id ? ({ kind, id } as DeepLinkTarget) : null;
  }

  return null;
}
