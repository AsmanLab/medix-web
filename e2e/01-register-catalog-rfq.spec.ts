import { test, expect } from "@playwright/test";
import {
  apiHealthy,
  firstPublishedProduct,
  gotoAuthed,
  registerClient,
  uniquePhone,
  E2E,
} from "./helpers";

test.describe("E2E #34 — register → catalog → RFQ", () => {
  test("Test 1: register, browse catalog, add to request, submit RFQ", async ({
    page,
    request,
  }) => {
    test.skip(!(await apiHealthy(request)), "API not reachable");

    const product = await firstPublishedProduct(request);
    test.skip(!product, "No published products in catalog");

    const phone = uniquePhone();
    const password = E2E.password;
    await registerClient(page, { phone, password });

    await gotoAuthed(page, `/product/${product!.slug}`, phone, password);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "В запрос (RFQ)" }).click();

    await gotoAuthed(page, "/cart", phone, password);
    await expect(page.getByRole("heading", { name: "Корзина RFQ" })).toBeVisible();
    await expect(page.getByText(product!.name_ru)).toBeVisible();

    await page.getByRole("button", { name: "Отправить запрос" }).click();

    const gate = page.getByRole("dialog");
    if (await gate.isVisible().catch(() => false)) {
      await expect(page.getByText("Аккаунт на проверке")).toBeVisible();
      await page.getByRole("button", { name: "Отправить всё равно" }).click();
    }

    await expect(page).toHaveURL(/\/cart\/success/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Запрос отправлен" })).toBeVisible();
  });
});
