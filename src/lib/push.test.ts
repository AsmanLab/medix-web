import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Проверяется решение «показывать ли кнопку и что она сделает» — оно целиком
 * зависит от окружения браузера, а не от Firebase. Сам SDK не трогаем:
 * он подгружается динамически и в jsdom не работает.
 */

/**
 * SDK Firebase подменён целиком: в jsdom он не работает и роняет
 * необработанный промис из внутренней проверки поддержки браузера. Проверяем
 * не его, а наше решение — обращаться ли к нему и что делать с токеном.
 */
const mocks = vi.hoisted(() => ({
  registerDevice: vi.fn(async () => ({ status: "registered" })),
  removeDevice: vi.fn(async () => undefined),
  getToken: vi.fn(async () => "fcm-token-from-firebase"),
}));

vi.mock("@/api/notifications", () => ({
  registerDevice: mocks.registerDevice,
  removeDevice: mocks.removeDevice,
}));

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
}));

vi.mock("firebase/messaging", () => ({
  getMessaging: vi.fn(() => ({})),
  getToken: mocks.getToken,
}));

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

async function loadResume() {
  vi.resetModules();
  const mod = await import("@/lib/push");
  return mod.resumePushOnLogin;
}

/** Регистрация service worker'а — первый шаг подписки, по ней и судим. */
function swRegister() {
  return (navigator.serviceWorker as unknown as { register: ReturnType<typeof vi.fn> })
    .register;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
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

describe("resumePushOnLogin", () => {
  it("восстанавливает подписку, если разрешение уже выдано", async () => {
    // При выходе подписка снимается на сервере, разрешение браузера остаётся.
    // Без восстановления человек, включивший уведомления однажды, после
    // каждого входа находил бы их выключенными.
    setEnv();
    setBrowser({ permission: "granted" });

    await (await loadResume())();

    expect(swRegister()).toHaveBeenCalled();
    expect(mocks.registerDevice).toHaveBeenCalledWith({
      platform: "fcm",
      token: "fcm-token-from-firebase",
    });
    expect(window.localStorage.getItem("medix.push_token.v1")).toBe(
      "fcm-token-from-firebase",
    );
  });

  it("молчит, если разрешение не выдавали", async () => {
    // Просить разрешение при входе нельзя: спросить можно один раз, и потратить
    // эту попытку на момент, когда человек о уведомлениях не думал, — потерять её.
    setEnv();
    setBrowser({ permission: "default" });

    await (await loadResume())();

    expect(mocks.registerDevice).not.toHaveBeenCalled();
  });

  it("молчит, если Firebase не настроен", async () => {
    setEnv({ VITE_FIREBASE_VAPID_KEY: "" });
    setBrowser({ permission: "granted" });

    await (await loadResume())();

    expect(mocks.registerDevice).not.toHaveBeenCalled();
  });

  it("не трогает подписку, когда она уже есть", async () => {
    setEnv();
    setBrowser({ permission: "granted" });
    window.localStorage.setItem("medix.push_token.v1", "fcm-token");

    await (await loadResume())();

    expect(mocks.registerDevice).not.toHaveBeenCalled();
  });
});
