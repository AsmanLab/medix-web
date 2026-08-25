import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/api/client";

/**
 * Регресс: без таймаута зависший `fetch` (например nginx на проде держит
 * upstream по устаревшему IP контейнера и не отвечает ни успехом, ни
 * ошибкой) оставлял мутацию в `isPending` навсегда — кнопки, завязанные
 * на это состояние, блокировались без возможности разблокировать иначе,
 * чем перезагрузкой страницы.
 */
function mockHangingFetch() {
  return vi.fn().mockImplementation(
    (_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) return;
        if (signal.aborted) {
          reject(signal.reason);
          return;
        }
        signal.addEventListener("abort", () => reject(signal.reason));
      }),
  );
}

describe("apiRequest — сетевой таймаут", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("успешный запрос разрешается как обычно", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(apiRequest<{ ok: boolean }>({ path: "/ping" })).resolves.toEqual({
      ok: true,
    });
  });

  it("зависший запрос отменяется по таймауту, а не висит вечно", async () => {
    vi.stubGlobal("fetch", mockHangingFetch());

    await expect(
      apiRequest({ path: "/hangs", timeoutMs: 20 }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("время ожидания"),
    });
  });

  it("внешний AbortSignal продолжает отменять запрос как раньше", async () => {
    vi.stubGlobal("fetch", mockHangingFetch());
    const controller = new AbortController();

    const promise = apiRequest({
      path: "/cancel-me",
      signal: controller.signal,
      timeoutMs: 5_000,
    });
    controller.abort();

    await expect(promise).rejects.toMatchObject({
      message: expect.stringContaining("отменён"),
    });
  });
});
