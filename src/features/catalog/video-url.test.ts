import { describe, expect, it } from "vitest";
import { parseVideoUrl } from "./video-url";

describe("parseVideoUrl", () => {
  it("разбирает обычную ссылку YouTube из адресной строки", () => {
    const parsed = parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(parsed).toEqual({
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      watchUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      providerLabel: "YouTube",
    });
  });

  it("понимает короткую ссылку youtu.be и shorts", () => {
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")?.embedUrl).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(
      parseVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")?.embedUrl,
    ).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("не теряет лишние параметры ссылки — берёт только идентификатор", () => {
    const parsed = parseVideoUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&t=42s",
    );
    expect(parsed?.watchUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("разбирает Rutube — именно он в спарсенных данных заказчика", () => {
    const parsed = parseVideoUrl(
      "https://rutube.ru/video/c94c6f1c1b8d4a2f9e0d/",
    );
    expect(parsed).toEqual({
      provider: "rutube",
      embedUrl: "https://rutube.ru/play/embed/c94c6f1c1b8d4a2f9e0d",
      watchUrl: "https://rutube.ru/video/c94c6f1c1b8d4a2f9e0d/",
      providerLabel: "Rutube",
    });
  });

  it("принимает уже готовую embed-ссылку Rutube", () => {
    expect(
      parseVideoUrl("https://rutube.ru/play/embed/c94c6f1c1b8d4a2f9e0d")
        ?.embedUrl,
    ).toBe("https://rutube.ru/play/embed/c94c6f1c1b8d4a2f9e0d");
  });

  it("на пустом значении и мусоре возвращает null, а не пустой плеер", () => {
    expect(parseVideoUrl("")).toBeNull();
    expect(parseVideoUrl(null)).toBeNull();
    expect(parseVideoUrl(undefined)).toBeNull();
    expect(parseVideoUrl("   ")).toBeNull();
    expect(parseVideoUrl("просто текст")).toBeNull();
    expect(parseVideoUrl("https://vimeo.com/76979871")).toBeNull();
    expect(parseVideoUrl("https://www.youtube.com/")).toBeNull();
    expect(parseVideoUrl("https://www.youtube.com/watch?v=short")).toBeNull();
  });

  it("отбивает javascript: — ссылка приходит из админки в атрибут src", () => {
    expect(parseVideoUrl("javascript:alert(1)")).toBeNull();
  });
});
