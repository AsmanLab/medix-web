import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

export const E2E = {
  // `||`, а не `??`: в CI переменная может прийти пустой строкой, когда секрет
  // не задан, и `??` оставил бы apiBase пустым.
  apiBase:
    process.env.E2E_API_BASE_URL ||
    process.env.VITE_PUBLIC_API_BASE_URL ||
    "http://127.0.0.1:8000/api/v1",
  clientPhone: process.env.E2E_CLIENT_PHONE ?? "996700111001",
  clientPassword: process.env.E2E_CLIENT_PASSWORD ?? "SecurePass1",
  managerPhone: process.env.E2E_MANAGER_PHONE ?? "996700999002",
  managerPassword: process.env.E2E_MANAGER_PASSWORD ?? "SecurePass1",
  adminPhone: process.env.E2E_ADMIN_PHONE ?? "996700999001",
  adminPassword: process.env.E2E_ADMIN_PASSWORD ?? "SecurePass1",
  otp: process.env.E2E_OTP ?? "123456",
  password: process.env.E2E_PASSWORD ?? "SecurePass1",
};

export function uniquePhone(prefix = "9967008"): string {
  // 996XXXXXXXXX = 12 digits
  const suffix = String(Date.now() % 100_000).padStart(5, "0");
  return `${prefix.slice(0, 7)}${suffix}`;
}

export async function apiHealthy(request: APIRequestContext): Promise<boolean> {
  const root = E2E.apiBase.replace(/\/api\/v1\/?$/, "");
  try {
    const res = await request.get(`${root}/healthz`, { timeout: 5_000 });
    if (res.ok()) return true;
  } catch {
    /* fall through */
  }
  try {
    const res = await request.get(`${E2E.apiBase}/cms/contacts`, {
      timeout: 5_000,
    });
    return res.ok();
  } catch {
    return false;
  }
}

/**
 * Требовать живой API, если он вообще предполагался.
 *
 * Раньше каждый спек начинался с `test.skip(!(await apiHealthy(request)))`,
 * и без API все сценарии молча пропускались, а job в CI горел зелёным —
 * то есть «зелёный e2e» не означал ровно ничего.
 *
 * Теперь: если адрес API задан явно (`E2E_API_BASE_URL`) или выставлен
 * `E2E_REQUIRE_API=1`, недоступный API роняет тест. Локальный прогон без
 * поднятого бэкенда по-прежнему скипается — иначе разработчик не сможет
 * гонять юнит-часть.
 */
export async function requireApi(request: APIRequestContext): Promise<void> {
  if (await apiHealthy(request)) return;

  const required =
    process.env.E2E_REQUIRE_API === "1" || !!process.env.E2E_API_BASE_URL;

  if (required) {
    throw new Error(
      `E2E: API ${E2E.apiBase} недоступен, а прогон объявлен обязательным ` +
        `(E2E_API_BASE_URL задан или E2E_REQUIRE_API=1). ` +
        `Молчаливый skip здесь запрещён: он маскирует нерабочий стенд.`,
    );
  }

  test.skip(true, `API ${E2E.apiBase} недоступен — сценарий пропущен`);
}

export async function loginAs(
  page: Page,
  phone: string,
  password: string,
): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => {
    sessionStorage.clear();
  });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Вход в Medix" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByPlaceholder("996555000000").fill(phone);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

/** Full navigation + wait until session is restored (or re-login). */
export async function gotoAuthed(
  page: Page,
  path: string,
  phone: string,
  password: string,
): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
  // Give bootstrapSession a moment to refresh access token
  await page.waitForTimeout(400);
  if (page.url().includes("/login")) {
    await loginAs(page, phone, password);
    await page.goto(path);
    await page.waitForLoadState("domcontentloaded");
  }
}

export async function registerClient(
  page: Page,
  input: { phone: string; password?: string; fullName?: string; otp?: string },
): Promise<void> {
  const password = input.password ?? E2E.password;
  const otp = input.otp ?? E2E.otp;
  // Три шага: телефон → код → ФИО и пароль. Пароль спрашивается последним,
  // чтобы он не жил в стейте, пока пользователь ходит за SMS.
  await page.goto("/register");
  await page.getByPlaceholder("996555000000").fill(input.phone);
  await page.getByRole("button", { name: "Получить код" }).click();

  // Стенд может быть настроен так, что регистрация в принципе невозможна:
  // с боевым ключом SMS мок-код отключён и send-otp отвечает 503, а серверный
  // лимит даёт 429. Без этой проверки тест падал на невидимом поле ввода кода,
  // и причина выглядела как поломка UI.
  try {
    await expect(page.getByText("Подтвердите номер")).toBeVisible({
      timeout: 20_000,
    });
  } catch (cause) {
    const body = await page.locator("body").innerText();
    const reason = /SMS-шлюз[^\n]*|Слишком много попыток[^\n]*/.exec(body)?.[0];
    throw new Error(
      reason
        ? `E2E: стенд не выдаёт код подтверждения — «${reason}». ` +
          `Нужен мок-OTP (пустой SMS_NIKITA_API_KEY) и свободный лимит /auth/send-otp.`
        : `E2E: шаг подтверждения номера не открылся. Экран: ${body.slice(0, 200)}`,
      { cause },
    );
  }
  await page.getByPlaceholder("Код (dev: 123456)").fill(otp);
  await page.getByRole("button", { name: "Подтвердить" }).click();

  await expect(page.getByText("Последний шаг")).toBeVisible();
  await page.getByPlaceholder("ФИО").fill(input.fullName ?? "E2E Client");
  await page.getByPlaceholder("Пароль (мин. 8)").fill(password);
  // Без согласия на обработку ПДн кнопка заблокирована, а сервер отвечает
  // consent_required — галочка обязательна, а не косметическая.
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page).toHaveURL(/\/profile/, { timeout: 25_000 });
}

export async function apiLogin(
  request: APIRequestContext,
  phone: string,
  password: string,
): Promise<string> {
  const res = await request.post(`${E2E.apiBase}/auth/login`, {
    data: { phone, password },
  });
  expect(res.ok(), `login ${phone}: ${res.status()} ${await res.text()}`).toBeTruthy();
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}

type ProductRow = { id: string; slug: string; name_ru: string; sku?: string };

export async function firstPublishedProduct(
  request: APIRequestContext,
): Promise<ProductRow | null> {
  const res = await request.get(`${E2E.apiBase}/catalog/products?limit=10`);
  if (!res.ok()) return null;
  const items = (await res.json()) as ProductRow[];
  return items[0] ?? null;
}

export async function apiAuthHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}
