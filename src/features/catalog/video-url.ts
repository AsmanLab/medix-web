/**
 * Разбор ссылки на видеообзор товара.
 *
 * В админке заказчик вставляет обычную ссылку из адресной строки — ту, что
 * копируется с YouTube или Rutube. Встроить её как есть нельзя: `watch?v=`
 * и `rutube.ru/video/` отдают страницу целиком, а не плеер, и iframe с такой
 * ссылкой остаётся пустым. Отсюда преобразование во встраиваемый адрес.
 *
 * Всё, что не опознано уверенно, даёт null — витрина в этом случае просто
 * не показывает вкладку «Видео». Показать сломанный плеер хуже, чем не
 * показать ничего: пустой чёрный прямоугольник выглядит как поломка сайта.
 */

export type VideoProvider = "youtube" | "rutube";

export type ParsedVideo = {
  provider: VideoProvider;
  /** Адрес для iframe. */
  embedUrl: string;
  /** Адрес для перехода на площадку. */
  watchUrl: string;
  /** Подпись ссылки «смотреть на площадке». */
  providerLabel: string;
};

/** Идентификатор ролика: буквы, цифры, дефис и подчёркивание. */
const ID = /^[A-Za-z0-9_-]{6,64}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
const YOUTUBE_SHORT_HOSTS = new Set(["youtu.be", "www.youtu.be"]);
const RUTUBE_HOSTS = new Set(["rutube.ru", "www.rutube.ru"]);

function segments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

function youtubeId(url: URL): string | null {
  if (YOUTUBE_SHORT_HOSTS.has(url.hostname)) {
    return segments(url.pathname)[0] ?? null;
  }

  const parts = segments(url.pathname);
  if (parts[0] === "watch") return url.searchParams.get("v");
  // /embed/<id>, /shorts/<id>, /live/<id> — одна и та же форма.
  if (parts.length >= 2 && ["embed", "shorts", "live", "v"].includes(parts[0])) {
    return parts[1];
  }
  return null;
}

function rutubeId(url: URL): string | null {
  const parts = segments(url.pathname);
  // /video/<id>/ и /play/embed/<id>
  if (parts[0] === "video" && parts[1]) return parts[1];
  if (parts[0] === "play" && parts[1] === "embed" && parts[2]) return parts[2];
  return null;
}

export function parseVideoUrl(
  raw: string | null | undefined,
): ParsedVideo | null {
  const value = raw?.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  if (YOUTUBE_HOSTS.has(url.hostname) || YOUTUBE_SHORT_HOSTS.has(url.hostname)) {
    const id = youtubeId(url);
    if (!id || !ID.test(id)) return null;
    return {
      provider: "youtube",
      // nocookie-домен не ставит рекламных cookie до запуска ролика.
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      providerLabel: "YouTube",
    };
  }

  if (RUTUBE_HOSTS.has(url.hostname)) {
    const id = rutubeId(url);
    if (!id || !ID.test(id)) return null;
    return {
      provider: "rutube",
      embedUrl: `https://rutube.ru/play/embed/${id}`,
      watchUrl: `https://rutube.ru/video/${id}/`,
      providerLabel: "Rutube",
    };
  }

  return null;
}
