import type { components } from "@/api/generated/openapi";
import { apiRequest } from "@/api/client";

export type ManagersReport = components["schemas"]["ManagersReportResponse"];
export type ManagerReportRow = components["schemas"]["ManagerReportRowOut"];

export type ReportPeriod = { year: number; month: number };

/**
 * Отчёт за месяц по менеджерам (ТЗ п. 11.3).
 *
 * Менеджер получает только свою строку, админ — всех. Строка с
 * `manager_id: null` — сделки, у которых менеджера нет.
 */
export function fetchManagersReport(
  period: ReportPeriod,
  signal?: AbortSignal,
) {
  return apiRequest<ManagersReport>({
    path: "/manager/reports/managers",
    query: { year: period.year, month: period.month },
    signal,
  });
}

/** Тот же отчёт в CSV — колонки по ТЗ п. 11.3. */
export function fetchManagersReportCsv(period: ReportPeriod) {
  return apiRequest<Blob>({
    path: "/manager/reports/managers.csv",
    query: { year: period.year, month: period.month },
    headers: { Accept: "text/csv" },
    responseType: "blob",
  });
}
