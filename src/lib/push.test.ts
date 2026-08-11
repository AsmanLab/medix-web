import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Проверяется решение «показывать ли кнопку и что она сделает» — оно целиком
 * зависит от окружения браузера, а не от Firebase. Сам SDK не трогаем:
 * он подгружается динамически и в jsdom не работает.
 */

const ENV = {
  VITE_PUBLIC_API_BASE_URL: "http://localhost:8000/api/v1",
  VITE_FIREBASE_API_KEY: "key",
  VITE_FIREBASE_PROJECT_ID: "project",
  VITE_FIREBASE_APP_ID: "app",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "sender",
  VITE_FIREBASE_VAPID_KEY: "vapid",
};

function setEnv(overrides: Record<string, string> = {}) {
  for (const [key, value] of Object.entries({ ...ENV, ...overrides })) {
    vi.stubEnv(key, value);
  }
}

function setBrowser({
  permission = "default",
  serviceWorker = true,
  pushManager = true,
}: {
  permission?: NotificationPermission;
  serviceWorker?: boolean;
  pushManager?: boolean;
} = {}) {
  vi.stubGlobal("Notification", { permission });
  if (serviceWorker) {
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: vi.fn() },
      configurable: true,
    });
  } else {
    // @ts-expect-error — имитируем браузер без service worker'ов
    delete navigator.serviceWorker;
  }
  if (pushManager) vi.stubGlobal("PushManager", class {});
  else vi.unstubAllGlobals();
}

async function loadPushSupport() {
  vi.resetModules();
  const mod = await import("@/lib/push");
  return mod.pushSupport;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("pushSupport", () => {
  it("без конфигурации Firebase кнопку показывать нельзя", async () => {
    // Кнопка, которая заведомо ничего не сделает, хуже её отсутствия:
    // пользователь нажимает «Разрешить» и не получает ничего.
    setEnv({ VITE_FIREBASE_API_KEY: "" });
    setBrowser();

    expect((await loadPushSupport())()).toBe("not-configured");
  });

  it("частично заполненный конфиг считается ненастроенным", async () => {
    setEnv({ VITE_FIREBASE_VAPID_KEY: "" });
    setBrowser();

    expect((await loadPushSupport())()).toBe("not-configured");
  });

  it("браузер без service worker'ов не поддерживается", async () => {
    setEnv();
    setBrowser({ serviceWorker: false });

    expect((await loadPushSupport())()).toBe("unsupported");
  });

  it("запрет в настройках браузера отличается от «ещё не спрашивали»", async () => {
    setEnv();
    setBrowser({ permission: "denied" });

    expect((await loadPushSupport())()).toBe("denied");
  });

  it("разрешение выдано, но токена нет — предлагаем включить", async () => {
    setEnv();
    setBrowser({ permission: "granted" });

    expect((await loadPushSupport())()).toBe("ready");
  });

  it("разрешение и сохранённый токен — уведомления включены", async () => {
    setEnv();
    setBrowser({ permission: "granted" });
    window.localStorage.setItem("medix.push_token.v1", "fcm-token");

    expect((await loadPushSupport())()).toBe("enabled");
  });
});
