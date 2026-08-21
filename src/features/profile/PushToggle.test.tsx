import { cleanup, screen } from "@testing-library/react";
import { renderWithProviders as render } from "@/test/render";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PushSupport } from "@/lib/push";

const mocks = vi.hoisted(() => ({ pushSupport: vi.fn<() => PushSupport>() }));

vi.mock("@/lib/push", () => ({
  pushSupport: mocks.pushSupport,
  enablePush: vi.fn(),
  disablePush: vi.fn(),
}));

vi.mock("@/api/notifications", () => ({ sendTestPush: vi.fn() }));

const { PushToggle } = await import("@/features/profile/PushToggle");

afterEach(cleanup);

describe("PushToggle", () => {
  it("на iPhone во вкладке объясняет, что делать, а не исчезает", () => {
    // Молчаливое исчезновение читалось как поломка: человек открывал профиль
    // в Safari, потом в Chrome и нигде не находил кнопку.
    mocks.pushSupport.mockReturnValue("needs-install");

    render(<PushToggle />);

    expect(screen.getByText(/на экран/i)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("без настроенного Firebase не показывает ничего", () => {
    mocks.pushSupport.mockReturnValue("not-configured");

    const { container } = render(<PushToggle />);

    expect(container).toBeEmptyDOMElement();
  });

  it("на десктопе без поддержки тоже ничего не показывает", () => {
    // Подсказка про домашний экран уместна только на iOS: на десктопе
    // устанавливать нечего.
    mocks.pushSupport.mockReturnValue("unsupported");

    const { container } = render(<PushToggle />);

    expect(container).toBeEmptyDOMElement();
  });

  it("когда push доступен — предлагает включить", () => {
    mocks.pushSupport.mockReturnValue("ready");

    render(<PushToggle />);

    expect(screen.getByRole("button", { name: "Включить" })).toBeTruthy();
  });

  it("у включённых уведомлений объясняет, почему проверка молчит", () => {
    // Пока приложение открыто, системного уведомления не будет: FCM отдаёт
    // сообщение самой странице. Без этой строки проверка выглядит так,
    // будто push не работают, — заказчик так и решил.
    mocks.pushSupport.mockReturnValue("enabled");

    render(<PushToggle />);

    expect(screen.getByRole("button", { name: "Проверить" })).toBeTruthy();
    expect(screen.getByText(/сверните приложение/i)).toBeTruthy();
  });
});
