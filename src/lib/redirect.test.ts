import { describe, expect, it } from "vitest";
import { isSafeInternalPath, safeInternalPath } from "@/lib/redirect";

describe("isSafeInternalPath", () => {
  it("принимает пути внутри приложения", () => {
    expect(isSafeInternalPath("/cart")).toBe(true);
    expect(isSafeInternalPath("/product/uzi-1")).toBe(true);
    expect(isSafeInternalPath("/catalog?q=узи")).toBe(true);
    expect(isSafeInternalPath("/orders/1#items")).toBe(true);
  });

  it("отбрасывает абсолютные адреса", () => {
    // Ровно этим и был open redirect: /login?redirect=https://example.com
    // уводил на чужой сайт сразу после ввода пароля.
    expect(isSafeInternalPath("https://example.com")).toBe(false);
    expect(isSafeInternalPath("http://example.com/path")).toBe(false);
    expect(isSafeInternalPath("HTTPS://EXAMPLE.COM")).toBe(false);
  });

  it("отбрасывает протокол-относительные адреса", () => {
    expect(isSafeInternalPath("//example.com")).toBe(false);
    expect(isSafeInternalPath("//example.com/path")).toBe(false);
    expect(isSafeInternalPath("/\\example.com")).toBe(false);
  });

  it("отбрасывает javascript: и data:", () => {
    expect(isSafeInternalPath("javascript:alert(1)")).toBe(false);
    expect(isSafeInternalPath("data:text/html,<script>alert(1)</script>")).toBe(
      false,
    );
  });

  it("отбрасывает строки с управляющими символами", () => {
    // Браузер вырезает их при разборе, поэтому «/\thttps://…» после
    // нормализации может оказаться внешним адресом.
    expect(isSafeInternalPath("/\thttps://example.com")).toBe(false);
    expect(isSafeInternalPath("/\nhttps://example.com")).toBe(false);
    expect(isSafeInternalPath("/\rhttps://example.com")).toBe(false);
  });

  it("отбрасывает пустое и не-строки", () => {
    expect(isSafeInternalPath("")).toBe(false);
    expect(isSafeInternalPath(undefined)).toBe(false);
    expect(isSafeInternalPath(null)).toBe(false);
    expect(isSafeInternalPath(42)).toBe(false);
    expect(isSafeInternalPath("cart")).toBe(false);
  });
});

describe("safeInternalPath", () => {
  it("возвращает путь, когда он внутренний", () => {
    expect(safeInternalPath("/cart", "/profile")).toBe("/cart");
  });

  it("возвращает fallback для чужого адреса", () => {
    expect(safeInternalPath("https://example.com", "/profile")).toBe("/profile");
    expect(safeInternalPath(undefined, "/profile")).toBe("/profile");
  });
});
