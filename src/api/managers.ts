import type { components } from "@/api/generated/openapi";
import { apiRequest } from "@/api/client";

export type ManagerOut = components["schemas"]["ManagerOut"];

/**
 * Менеджеры, из которых клиент может выбрать своего при оформлении (Б7 ТЗ).
 *
 * Выбор необязательный и нужен для учёта продаж: если менеджер не выбран,
 * запрос попадает в общую очередь. Список отдаёт только имена — телефоны
 * и роли сотрудников остаются в админской части.
 */
export function fetchManagers(signal?: AbortSignal) {
  return apiRequest<ManagerOut[]>({ path: "/managers", signal });
}
