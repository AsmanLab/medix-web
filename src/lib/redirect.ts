/**
 * Проверка адресов, приходящих извне (?redirect=…, link_url баннера).
 *
 * `/login?redirect=…` подставлялся в навигацию как есть, поэтому ссылка
 * `/login?redirect=https://example.com` уводила пользователя на чужой сайт
 * сразу после успешного входа — на странице, которой он только что доверил
 * пароль. Это классический open redirect: он же делает убедительным фишинг
 * («ссылка ведь на medix…»).
 *
 * Разрешаем только путь внутри приложения. Всё остальное — включая
 * протокол-относительные `//evil.com` и `/\evil.com`, которые браузер
 * трактует как внешний хост, — отбрасываем.
 */

// Управляющие символы браузеры вырезают при разборе URL, поэтому строка
// вроде "/\thttps://evil.com" может стать внешним адресом уже после проверки.
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001f\\u007f]");

const PROBE_ORIGIN = "http://medix.invalid";

export function isSafeInternalPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  if (CONTROL_CHARS.test(value)) return false;
  if (!value.startsWith("/")) return false;
  // `//host` и `/\host` браузер разбирает как протокол-относительный URL.
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  // Даже пройдя проверки выше, строка не должна разбираться как абсолютный URL.
  try {
    if (new URL(value, PROBE_ORIGIN).origin !== PROBE_ORIGIN) return false;
  } catch {
    return false;
  }
  return true;
}

/**
 * Внутренний путь или `fallback`, если адрес чужой либо не задан.
 */
export function safeInternalPath(value: unknown, fallback: string): string {
  return isSafeInternalPath(value) ? value : fallback;
}
