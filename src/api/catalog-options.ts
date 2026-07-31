import { apiRequest } from "@/api/client";
import type {
  OptionGroupOut,
  ProductDetailOut,
  ProductOptionOut,
} from "@/api/generated/schemas";

export type { OptionGroupOut, ProductOptionOut };

/**
 * Конфигуратор товара (ТЗ п. 10.1, Б9): группы комплектаций и опции внутри них.
 *
 * Все операции возвращают карточку товара целиком — это позволяет обновить
 * кэш одним ответом, не перезапрашивая товар после каждой правки.
 */
export type OptionType = "variant" | "addon" | "accessory" | "service";

export const OPTION_TYPE_LABEL: Record<OptionType, string> = {
  variant: "Вариант комплектации",
  addon: "Дополнение",
  accessory: "Аксессуар",
  service: "Услуга",
};

/**
 * Разбирает цену опции из поля ввода.
 *
 * Пустая строка — это «цена по запросу» (`null`), а не ноль: опция без цены
 * переводит всю сделку в RFQ, тогда как нулевая цена оставляет её заказом.
 * Возвращает `undefined`, если ввод не число — вызывающий не должен отправлять
 * такое на сервер.
 */
export function parseOptionPrice(input: string): number | null | undefined {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return undefined;
  return value;
}

function groupPath(productId: string, groupId?: string) {
  const base = `/admin/catalog/products/${encodeURIComponent(productId)}/option-groups`;
  return groupId ? `${base}/${encodeURIComponent(groupId)}` : base;
}

export function createOptionGroup(
  productId: string,
  body: { name_ru: string; sort?: number },
) {
  return apiRequest<ProductDetailOut>({
    method: "POST",
    path: groupPath(productId),
    body: { name_ru: body.name_ru, sort: body.sort ?? 0 },
  });
}

export function updateOptionGroup(
  productId: string,
  groupId: string,
  body: { name_ru?: string; sort?: number },
) {
  return apiRequest<ProductDetailOut>({
    method: "PATCH",
    path: groupPath(productId, groupId),
    body,
  });
}

export function deleteOptionGroup(productId: string, groupId: string) {
  return apiRequest<void>({
    method: "DELETE",
    path: groupPath(productId, groupId),
  });
}

export type CreateOptionBody = {
  name_ru: string;
  name_en?: string;
  option_type: OptionType;
  /** null — «по запросу»: такая опция переводит всю сделку в RFQ. */
  price_amount?: number | null;
  is_required?: boolean;
  sort?: number;
};

export function createProductOption(
  productId: string,
  groupId: string,
  body: CreateOptionBody,
) {
  return apiRequest<ProductDetailOut>({
    method: "POST",
    path: `${groupPath(productId, groupId)}/options`,
    body: {
      name_ru: body.name_ru,
      name_en: body.name_en ?? "",
      option_type: body.option_type,
      price_amount: body.price_amount ?? null,
      is_required: body.is_required ?? false,
      sort: body.sort ?? 0,
    },
  });
}

export type UpdateOptionBody = Partial<CreateOptionBody> & {
  is_active?: boolean;
};

export function updateProductOption(
  productId: string,
  groupId: string,
  optionId: string,
  body: UpdateOptionBody,
) {
  return apiRequest<ProductDetailOut>({
    method: "PATCH",
    path: `${groupPath(productId, groupId)}/options/${encodeURIComponent(optionId)}`,
    body,
  });
}

export function deleteProductOption(
  productId: string,
  groupId: string,
  optionId: string,
) {
  return apiRequest<void>({
    method: "DELETE",
    path: `${groupPath(productId, groupId)}/options/${encodeURIComponent(optionId)}`,
  });
}
