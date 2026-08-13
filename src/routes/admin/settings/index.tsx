import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import {
  fetchInvoiceSettings,
  saveInvoiceSettings,
  type InvoiceSettingsInput,
} from "@/api/settings";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { requireStaffPanel } from "@/session/guards";

export const Route = createFileRoute("/admin/settings/")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: SettingsAdminPage,
});

const EMPTY: InvoiceSettingsInput = {
  company_name: "",
  inn: "",
  bank_name: "",
  bank_account: "",
  bik: "",
  legal_address: "",
  phone: "",
  extra_note: "",
};

const FIELDS: [keyof InvoiceSettingsInput, string, string][] = [
  ["company_name", "Название организации", "ОсОО «Medix International»"],
  ["inn", "ИНН", "01234567890123"],
  ["legal_address", "Юридический адрес", "г. Бишкек, ул. ..."],
  ["phone", "Телефон", "+996 555 000 111"],
  ["bank_name", "Банк", "ОАО «Бакай Банк»"],
  ["bank_account", "Расчётный счёт", "1240020002081563"],
  ["bik", "БИК", "124001"],
];

/** Реквизиты организации для счёта — договор п. 5.2, ТЗ п. 10.1 «Настройки». */
function SettingsAdminPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<InvoiceSettingsInput>(EMPTY);

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.invoice(),
    queryFn: ({ signal }) => fetchInvoiceSettings(signal),
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    const { preview: _preview, ...rest } = settingsQuery.data;
    setForm({ ...EMPTY, ...rest });
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => saveInvoiceSettings(form),
    onSuccess: async (saved) => {
      queryClient.setQueryData(queryKeys.settings.invoice(), saved);
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      toast.success("Реквизиты сохранены");
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось сохранить");
    },
  });

  function update(key: keyof InvoiceSettingsInput, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
          <Building2 className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Настройки</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Реквизиты организации для счетов
          </p>
        </div>
      </div>

      <StateBlock
        isLoading={settingsQuery.isLoading}
        isError={settingsQuery.isError}
        error={settingsQuery.error}
        onRetry={() => void settingsQuery.refetch()}
      >
        <form
          className="space-y-5 rounded-3xl border border-border bg-card p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <div className="rounded-2xl bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
            Реквизиты подставляются в счёт в момент его создания и сохраняются
            в нём копией. Правка здесь меняет только новые счета — уже
            выставленные остаются с прежними реквизитами.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map(([key, label, placeholder]) => (
              <label key={key} className="block text-xs font-semibold">
                {label}
                <input
                  value={form[key] ?? ""}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder={placeholder}
                  className="field-control mt-1.5"
                />
              </label>
            ))}
          </div>

          <label className="block text-xs font-semibold">
            Дополнительно
            <textarea
              value={form.extra_note ?? ""}
              onChange={(e) => update("extra_note", e.target.value)}
              placeholder="Условия оплаты, НДС, примечание"
              className="mt-1.5 min-h-[80px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          {settingsQuery.data?.preview ? (
            <div>
              <p className="text-xs font-semibold">Как это выглядит в счёте</p>
              <pre className="mt-1.5 whitespace-pre-line rounded-xl border border-border bg-muted/30 p-3 font-sans text-xs">
                {settingsQuery.data.preview}
              </pre>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Пока реквизиты не заполнены, счёт выставляется без этого блока.
            </p>
          )}

          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit" disabled={saveMutation.isPending}>
              <Save className="h-4 w-4" aria-hidden />
              {saveMutation.isPending ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        </form>
      </StateBlock>
    </div>
  );
}
