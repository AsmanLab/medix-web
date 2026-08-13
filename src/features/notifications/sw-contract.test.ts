import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Сверка service worker'а с кодом страницы.
 *
 * SW отдаётся без сборки и импортировать ничего из `src/` не может, поэтому
 * договорённости между ними живут в двух местах и разъезжаются молча.
 * Здесь проверяется то, что разъехалось 13.08 и стоило заказчику двух
 * одинаковых уведомлений на каждое нажатие «Проверить».
 *
 * Соседний файл `deep-link.test.ts` тем же способом сверяет таблицу адресов.
 */
const sw = readFileSync("public/firebase-messaging-sw.js", "utf8");
const bridge = readFileSync(
  "src/features/notifications/PushForegroundBridge.tsx",
  "utf8",
);

describe("контракт service worker'а и страницы", () => {
  it("тег уведомления считается одинаково с обеих сторон", () => {
    /*
     * Свёрнутое приложение остаётся живым клиентом: сообщение приходит
     * и в страницу, и в service worker, и показывают его оба. При равном
     * теге второй показ заменяет первый — видно одно уведомление.
     * Разные теги (было «medix-notification» против deep_link) дают два.
     */
    expect(sw).toContain('tag: deepLink || "medix"');
    expect(bridge).toContain('tag: message.deepLink || "medix"');
  });

  it("service worker берёт заголовок и текст из data", () => {
    // Сервер шлёт вебу data-only: с блоком notification уведомление
    // показывал ещё и сам SDK Firebase, автоматически и вдобавок к нашему.
    expect(sw).toContain("data.title");
    expect(sw).toContain("data.body");
    expect(sw).toContain("data.deep_link");
  });

  it("оставлен запасной путь на время выката", () => {
    // Service worker обновляется у клиентов не мгновенно, а сервер уже
    // может слать новый формат — и наоборот. Пока живы оба, заголовок
    // должен находиться в любом из них.
    expect(sw).toContain("payload.notification?.title");
    expect(sw).toContain("payload.notification?.body");
  });

  it("новый service worker вступает в силу сразу", () => {
    // Установленному на домашний экран приложению иначе досталась бы старая
    // копия до полной выгрузки — то есть правка про дубли не доехала бы
    // до того, кто на неё жаловался.
    expect(sw).toContain("self.skipWaiting()");
    expect(sw).toContain("clients.claim()");
  });
});
