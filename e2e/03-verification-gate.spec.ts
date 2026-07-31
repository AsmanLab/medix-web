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

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Организация ещё не подтверждена")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Отправить запрос" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Отмена" })).toBeVisible();
  });
});
