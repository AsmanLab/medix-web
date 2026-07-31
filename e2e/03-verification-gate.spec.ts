import { test, expect } from "@playwright/test";
import {
  requireApi,
  E2E,
  firstPublishedProduct,
  gotoAuthed,
  registerClient,
  uniquePhone,
} from "./helpers";

test.describe("E2E #34 — verification gate", () => {
  test("Test 4: register → verification modal on RFQ submit", async ({
    page,
    request,
  }) => {
    await requireApi(request);

    const product = await firstPublishedProduct(request);
    test.skip(!product, "No published products");

    const phone = uniquePhone("9967007");
    const password = E2E.password;
    await registerClient(page, { phone, password });

    await gotoAuthed(page, `/product/${product!.slug}`, phone, password);
    await page.getByRole("button", { name: "В корзину" }).click();
    await gotoAuthed(page, "/cart", phone, password);
    await page.getByRole("button", { name: "Отправить запрос на КП" }).click();

    const gate = page.getByRole("dialog");
    await expect(gate).toBeVisible();
    await expect(page.getByText("Организация ещё не подтверждена")).toBeVisible();
    // Ищем внутри диалога: на странице корзины есть кнопка «Отправить запрос
    // на КП», и поиск по всей странице находит обе.
    await expect(
      gate.getByRole("button", { name: "Отправить запрос", exact: true }),
    ).toBeVisible();
    await expect(gate.getByRole("button", { name: "Отмена" })).toBeVisible();
  });
});
