/**
 * Русское склонение числительных.
 *
 * По коду встречалось «1 позиций», «1 заказов», «3 подкатегорий» — число
 * подставлялось к форме множественного числа без согласования. На витрине,
 * где почти всё считается штуками, это читается как небрежность.
 */
export function pluralForm(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

/** «3 позиции» — число вместе с согласованной формой. */
export function plural(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  return `${count} ${pluralForm(count, one, few, many)}`;
}
