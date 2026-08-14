/**
 * Цена товара между API и полем ввода редактора.
 *
 * `price` приходит в человеческом виде — «50000.00 KGS». В поле
 * `<input type="number">` такое значение не живёт: браузер его не принимает
 * и показывает пустое поле, а сохранение падает на разборе числа. Админ видел
 * это как «цена сбрасывается при каждом обновлении товара» и вбивал её заново.
 *
 * Сырое число отдаёт `price_amount`. Разбор `price` оставлен запасным путём:
 * если витрина уедет в прод раньше API, поле не должно снова опустеть.
 */

type PriceFields = {
  price?: string | null;
  price_amount?: string | null;
};

/** Значение для поля ввода: сырое число или пустая строка. */
export function productPriceAmount(product: PriceFields | null): string {
  if (!product) return "";
  if (product.price_amount) return product.price_amount;
  if (!product.price) return "";
  const parsed = /^\s*(\d+(?:[.,]\d+)?)/.exec(product.price);
  return parsed ? parsed[1]!.replace(",", ".") : "";
}

/**
 * Разбор того, что админ ввёл руками.
 * `null` — цена по запросу, `undefined` — значение непригодно.
 */
export function parsePriceInput(
  raw: string,
  onRequest: boolean,
): number | null | undefined {
  if (onRequest) return null;
  const trimmed = raw.trim();
  // Пустое поле раньше уходило как Number("") === 0: цена молча
  // становилась нулём вместо «по запросу».
  if (!trimmed) return undefined;
  const value = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return undefined;
  return value;
}
