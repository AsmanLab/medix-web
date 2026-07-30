import { test, expect } from "@playwright/test";
import {
  apiAuthHeaders,
  apiHealthy,
  apiLogin,
  E2E,
  firstPublishedProduct,
  gotoAuthed,
  loginAs,
  registerClient,
  uniquePhone,
} from "./helpers";

test.describe("E2E #35 — admin catalog publish", () => {
  test("Test 1: admin creates category → product → publish", async ({
    page,
    request,
  }) => {
    test.skip(!(await apiHealthy(request)), "API not reachable");

    const stamp = Date.now().toString(36);
    const catName = `E2E Cat ${stamp}`;
    const catSlug = `e2e-cat-${stamp}`;
    const productName = `E2E Product ${stamp}`;
    const productSlug = `e2e-prod-${stamp}`;
    const sku = `E2E-${stamp}`.slice(0, 32);

    await loginAs(page, E2E.adminPhone, E2E.adminPassword);

    await gotoAuthed(
      page,
      "/admin/catalog/categories/new",
      E2E.adminPhone,
      E2E.adminPassword,
    );
    await expect(
      page.getByRole("heading", { name: "Новая категория" }),
    ).toBeVisible();

    await page.getByLabel("Название (RU) *").fill(catName);
    await page.getByLabel("Slug *").fill(catSlug);
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(
      page.getByRole("heading", { name: "Редактирование категории" }),
    ).toBeVisible({ timeout: 25_000 });

    await gotoAuthed(
      page,
      "/admin/catalog/products/new",
      E2E.adminPhone,
      E2E.adminPassword,
    );
    await expect(page.getByRole("heading", { name: "Новый товар" })).toBeVisible();

    await page.getByLabel("Название (RU) *").fill(productName);
    await page.getByLabel("Slug *").fill(productSlug);
    await page.getByLabel("SKU *").fill(sku);
    await page.getByText(catName, { exact: true }).click();
    await page.getByRole("button", { name: "Сохранить" }).click();

    await expect(page.getByText("Черновик")).toBeVisible({ timeout: 25_000 });
    await expect(page).toHaveURL(/\/admin\/catalog\/products\/[^/]+$/, {
      timeout: 25_000,
    });

    await page.getByRole("button", { name: "Опубликовать" }).click();
    await expect(page.getByText("Опубликован")).toBeVisible({ timeout: 20_000 });

    const pub = await request.get(
      `${E2E.apiBase}/catalog/products?limit=50`,
    );
    expect(pub.ok()).toBeTruthy();
    const items = (await pub.json()) as Array<{ slug: string; is_published?: boolean }>;
    expect(items.some((p) => p.slug === productSlug)).toBeTruthy();
  });
});

test.describe("E2E #35 — admin verify client", () => {
  test("Test 2: admin verifies client", async ({ page, request }) => {
    test.skip(!(await apiHealthy(request)), "API not reachable");

    const phone = uniquePhone("9967007");
    await registerClient(page, {
      phone,
      password: E2E.password,
      fullName: `E2E Verify ${phone.slice(-4)}`,
    });

    await loginAs(page, E2E.adminPhone, E2E.adminPassword);
    await gotoAuthed(page, "/admin/users", E2E.adminPhone, E2E.adminPassword);
    await expect(page.getByRole("heading", { name: "Клиенты" })).toBeVisible();

    await page.getByPlaceholder("Имя, организация, город…").fill(phone);
    await page.getByRole("button", { name: "Найти" }).click();

    const rowLink = page.locator(`a[href*="/admin/users/"]`).filter({ hasText: phone }).first();
    await expect(rowLink).toBeVisible({ timeout: 20_000 });
    await rowLink.click();

    await expect(
      page.getByRole("heading", { name: "Действия верификации" }),
    ).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Верифицировать" }).click();
    await expect(page.getByText("Проверен").first()).toBeVisible({
      timeout: 20_000,
    });
  });
});

test.describe("E2E #35 — banners (API + home)", () => {
  test("Test 3: create banner via API → visible on home (admin UI is stub)", async ({
    page,
    request,
  }) => {
    test.skip(!(await apiHealthy(request)), "API not reachable");

    const title = `E2E Banner ${Date.now().toString(36)}`;
    const token = await apiLogin(request, E2E.adminPhone, E2E.adminPassword);
    const headers = await apiAuthHeaders(token);

    const createRes = await request.post(`${E2E.apiBase}/admin/cms/banners`, {
      headers,
      data: {
        image_key: "banners/e2e-placeholder.jpg",
        title,
        subtitle: "E2E subtitle",
        cta_text: "Смотреть каталог",
        link_url: "/catalog",
        sort: 0,
      },
    });
    expect(
      createRes.ok(),
      `create banner: ${createRes.status()} ${await createRes.text()}`,
    ).toBeTruthy();
    const created = (await createRes.json()) as { id: string };

    await page.goto("/");
    await expect(page.getByRole("heading", { name: title })).toBeVisible({
      timeout: 25_000,
    });

    // cleanup
    await request.delete(`${E2E.apiBase}/admin/cms/banners/${created.id}`, {
      headers,
    });
  });
});

test.describe("E2E #35 — manager RFQ UI quote", () => {
  test("Test 4: manager takes RFQ from queue and sends quote", async ({
    page,
    request,
  }) => {
    test.skip(!(await apiHealthy(request)), "API not reachable");

    const product = await firstPublishedProduct(request);
    test.skip(!product, "No published products — run Test 1 or seed catalog");

    const phone = uniquePhone("9967005");
    const password = E2E.password;
    await registerClient(page, { phone, password });

    await gotoAuthed(page, `/product/${product!.slug}`, phone, password);
    await page.getByRole("button", { name: "В корзину" }).click();
    await gotoAuthed(page, "/cart", phone, password);
    await page.getByRole("button", { name: "Отправить запрос на КП" }).click();
    const gate = page.getByRole("dialog");
    if (await gate.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "Отправить запрос" }).click();
    }
    await expect(page).toHaveURL(/\/cart\/success/, { timeout: 30_000 });

    const url = new URL(page.url());
    let rfqId = url.searchParams.get("rfqId");
    if (!rfqId) {
      const mono = page.locator(".font-mono").first();
      rfqId = ((await mono.textContent()) ?? "").trim() || null;
    }
    test.skip(!rfqId, "RFQ id missing on success page");

    let staffPhone = E2E.managerPhone;
    let staffPassword = E2E.managerPassword;
    try {
      await apiLogin(request, staffPhone, staffPassword);
    } catch {
      staffPhone = E2E.adminPhone;
      staffPassword = E2E.adminPassword;
    }

    await loginAs(page, staffPhone, staffPassword);
    await gotoAuthed(
      page,
      `/admin/commerce/${rfqId}`,
      staffPhone,
      staffPassword,
    );

    const takeBtn = page.getByRole("button", { name: "Взять в работу" });
    if (await takeBtn.isVisible().catch(() => false)) {
      await takeBtn.click();
      await expect(takeBtn).toBeHidden({ timeout: 20_000 });
    }

    await expect(
      page.getByRole("heading", { name: "Конструктор КП" }),
    ).toBeVisible({ timeout: 20_000 });

    const priceInput = page.getByPlaceholder("по запросу").first();
    if (await priceInput.isVisible().catch(() => false)) {
      await priceInput.fill("15000");
    } else {
      // fallback: first number-ish input in quote section
      await page
        .locator("section")
        .filter({ hasText: "Конструктор КП" })
        .locator('input[type="text"], input:not([type])')
        .first()
        .fill("15000");
    }

    await page.getByRole("button", { name: "Отправить КП клиенту" }).click();
    await expect(page.getByText("Есть КП").first()).toBeVisible({
      timeout: 25_000,
    });

    const token = await apiLogin(request, staffPhone, staffPassword);
    const headers = await apiAuthHeaders(token);
    const detailRes = await request.get(`${E2E.apiBase}/manager/rfq/${rfqId}`, {
      headers,
    });
    expect(detailRes.ok()).toBeTruthy();
    const detail = (await detailRes.json()) as { status: string };
    expect(detail.status).toBe("quoted");
  });
});
