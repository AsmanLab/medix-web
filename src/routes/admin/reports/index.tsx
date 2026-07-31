import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { fetchManagersReport, fetchManagersReportCsv } from "@/api/reports";
import { StateBlock } from "@/components/shared/StateBlock";
import { formatAmount } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { requireStaffPanel } from "@/session/guards";

export const Route = createFileRoute("/admin/reports/")({
  // Менеджер видит только свою строку — выдачу ограничивает сервер.
  beforeLoad: () => requireStaffPanel({ roles: ["admin", "manager"] }),
  component: ReportsAdminPage,
});

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const fieldClass =
  "mt-1.5 flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Отчёт за месяц по менеджерам: ТЗ п. 9.1, 11.3, 14.5. */
function ReportsAdminPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [downloading, setDownloading] = useState(false);

  const reportQuery = useQuery({
    queryKey: queryKeys.reports.managers(year, month),
    queryFn: ({ signal }) => fetchManagersReport({ year, month }, signal),
  });

  const rows = reportQuery.data?.rows ?? [];
  const currency = reportQuery.data?.currency ?? "KGS";

  const totals = rows.reduce(
    (acc, r) => ({
      rfq: acc.rfq + r.rfq_count,
      orders: acc.orders + r.orders_count,
      amount: acc.amount + Number(r.total_amount),
    }),
    { rfq: 0, orders: 0, amount: 0 },
  );

  async function onDownloadCsv() {
    setDownloading(true);
    try {
      const blob = await fetchManagersReportCsv({ year, month });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `medix-managers-${year}-${String(month).padStart(2, "0")}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(isAppError(err) ? err.message : "Не удалось скачать CSV");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
          <FileUp className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Отчёты</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Запросы, заказы и суммы по менеджерам за месяц
          </p>
        </div>
      </div>

      <section className="flex flex-wrap items-end gap-4 rounded-3xl border border-border bg-card p-5">
        <label className="text-xs font-semibold">
          Месяц
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className={fieldClass}
          >
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Год
          <input
            type="number"
            value={year}
            min={2024}
            max={now.getFullYear() + 1}
            onChange={(e) => setYear(Number(e.target.value))}
            className={fieldClass}
          />
        </label>
        <Button
          variant="outline"
          disabled={downloading || rows.length === 0}
          onClick={() => void onDownloadCsv()}
        >
          <Download className="mr-1.5 h-4 w-4" aria-hidden />
          {downloading ? "Готовим…" : "Скачать CSV"}
        </Button>
      </section>

      <StateBlock
        isLoading={reportQuery.isLoading}
        isError={reportQuery.isError}
        error={reportQuery.error}
        isEmpty={reportQuery.isSuccess && rows.length === 0}
        onRetry={() => void reportQuery.refetch()}
        emptyTitle="За этот месяц данных нет"
      >
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Менеджер</th>
                <th className="px-4 py-3 text-right font-semibold">Запросы</th>
                <th className="px-4 py-3 text-right font-semibold">Заказы</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Сумма, {currency}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.manager_id ?? "unassigned"}>
                  <td className="px-4 py-3 font-medium">
                    {row.manager_name}
                    {row.manager_id === null ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        менеджер не выбран
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.rfq_count}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.orders_count}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatAmount(Number(row.total_amount), "")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-muted/30">
              <tr>
                <td className="px-4 py-3 font-semibold">Итого</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {totals.rfq}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {totals.orders}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {formatAmount(totals.amount, "")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </StateBlock>
    </div>
  );
}
