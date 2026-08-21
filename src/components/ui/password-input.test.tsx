import { cleanup, fireEvent, screen } from "@testing-library/react";
import { renderWithProviders as render } from "@/test/render";
import { afterEach, describe, expect, it } from "vitest";
import { PasswordInput } from "@/components/ui/password-input";

afterEach(cleanup);

describe("PasswordInput", () => {
  it("по умолчанию скрывает пароль", () => {
    render(<PasswordInput aria-label="Пароль" defaultValue="secret" />);

    expect(screen.getByLabelText("Пароль")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Показать пароль" })).toBeTruthy();
  });

  it("переключает видимость и подпись кнопки", () => {
    render(<PasswordInput aria-label="Пароль" defaultValue="secret" />);

    fireEvent.click(screen.getByRole("button", { name: "Показать пароль" }));
    expect(screen.getByLabelText("Пароль")).toHaveAttribute("type", "text");

    const hide = screen.getByRole("button", { name: "Скрыть пароль" });
    expect(hide.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(hide);
    expect(screen.getByLabelText("Пароль")).toHaveAttribute("type", "password");
  });

  it("кнопка не отправляет форму", () => {
    // type="button" здесь обязателен: внутри <form> кнопка по умолчанию
    // submit, и попытка посмотреть пароль отправляла бы форму.
    render(<PasswordInput aria-label="Пароль" />);

    expect(
      screen.getByRole("button", { name: "Показать пароль" }),
    ).toHaveAttribute("type", "button");
  });

  it("отступы вешаются на контейнер, а класс поля переопределяется", () => {
    render(
      <PasswordInput
        aria-label="Пароль"
        wrapperClassName="mt-1.5"
        className="custom-field"
      />,
    );

    const input = screen.getByLabelText("Пароль");
    expect(input.className).toContain("custom-field");
    expect(input.className).not.toContain("field-control");
    expect(input.parentElement?.className).toContain("mt-1.5");
  });
});
