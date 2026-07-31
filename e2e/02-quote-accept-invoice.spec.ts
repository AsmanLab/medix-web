import { test, expect } from "@playwright/test";
import {
  apiAuthHeaders,
  requireApi,
  apiLogin,
  E2E,
  firstPublishedProduct,
  gotoAuthed,
  loginAs,
  registerClient,
  uniquePhone,
} from "./helpers";

test.describe("E2E #34 — quote accept + invoice", () => {
  test("Test 2+3+5: manager quotes → client accepts → invoice", async ({
    page,
    request,
  }) => {
    await requireApi(request);

    const product = await firstPublishedProduct(request);
    test.skip(!product, "No published products");

    const phone = uniquePhone("9967006");
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

    let staffToken: string;
    try {
      staffToken = await apiLogin(
        request,
        E2E.managerPhone,
        E2E.managerPassword,
      );
    } catch {
      staffToken = await apiLogin(request, E2E.adminPhone, E2E.adminPassword);
    }
    const headers = await apiAuthHeaders(staffToken);

    const takeRes = await request.post(
      `${E2E.apiBase}/manager/rfq/${rfqId}/take`,
      { headers },
    );
    expect(
      [200, 204, 409].includes(takeRes.status()),
      `take RFQ: ${takeRes.status()}`,
    ).toBeTruthy();

    const detailRes = await request.get(
      `${E2E.apiBase}/manager/rfq/${rfqId}`,
      { headers },
    );
    expect(detailRes.ok()).toBeTruthy();
    const detail = (await detailRes.json()) as {
      items: Array<{
        product_id: string;
        sku: string;
        name: string;
        qty: number;
      }>;
    };

    const quoteItems = (
      detail.items?.length
        ? detail.items
        : [
            {
              product_id: product!.id,
              sku: product!.sku ?? "SKU",
              name: product!.name_ru,
              qty: 1,
            },
          ]
    ).map((item) => ({
      product_id: item.product_id,
      sku: item.sku,
      name: item.name,
      qty: item.qty,
      unit_price_amount: "1000.00",
      option_type: null,
      parent_line_id: null,
    }));

    const quoteRes = await request.post(
      `${E2E.apiBase}/manager/rfq/${rfqId}/quote`,
      {
        headers,
        data: {
          items: quoteItems,
          conditions: "E2E quote",
          valid_until: null,
        },
      },
    );
    expect(
      quoteRes.ok(),
      `quote: ${quoteRes.status()} ${await quoteRes.text()}`,
    ).toBeTruthy();

    await gotoAuthed(page, `/requests/${rfqId}`, phone, password);
    await page.getByRole("button", { name: "Принять КП" }).click();
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+/i, { timeout: 20_000 });
    await expect(
      page.getByText(/заказ|order|new|Новый/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    const invRes = await request.get(
      `${E2E.apiBase}/manager/rfq/${rfqId}/invoice`,
      { headers },
    );
    expect(invRes.ok(), `invoice: ${invRes.status()}`).toBeTruthy();
    const invoice = (await invRes.json()) as { id: string; status: string };
    if (invoice.status !== "published") {
      const pub = await request.post(
        `${E2E.apiBase}/manager/invoices/${invoice.id}/publish`,
        { headers },
      );
      expect([200, 204].includes(pub.status())).toBeTruthy();
    }
  });
});
