import { useMutation } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { isAppError } from "@/api/errors";
import {
  createManagerClient,
  type ManagerClientCreated,
} from "@/api/manager-clients";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/FormField";
import { TempPasswordDialog } from "@/features/admin/orders/TempPasswordDialog";

const CLIENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "individual", label: "Физлицо / ИП" },
  { value: "clinic", label: "Клиника" },
  { value: "laboratory", label: "Лаборатория" },
  { value: "hospital", label: "Больница" },
];

export type CreatedOrderClient = ManagerClientCreated & {
  organization: string;
};

type NewClientFormProps = {
  onCreated: (client: CreatedOrderClient) => void;
  onCancel: () => void;
};

/**
 * Форма нового клиента, принятого по телефонному звонку. Раскрывается,
 * когда в `ClientPicker` не нашлось совпадений. На успехе показывает
 * временный пароль ровно один раз (`TempPasswordDialog`), затем сразу
 * подставляет созданного клиента в форму заказа.
 */
export function NewClientForm({ onCreated, onCancel }: NewClientFormProps) {
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [clientType, setClientType] = useState("individual");
  const [created, setCreated] = useState<ManagerClientCreated | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      createManagerClient({
        phone: phone.trim(),
        full_name: fullName.trim(),
        organization: organization.trim(),
        city: city.trim(),
        address: address.trim(),
        client_type: clientType as
          | "clinic"
          | "laboratory"
          | "hospital"
          | "individual",
      }),
    onSuccess: (res) => {
      setCreated(res);
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось создать клиента");
    },
  });

  if (created) {
    return (
      <TempPasswordDialog
        phone={created.phone}
        fullName={created.full_name}
        password={created.temporary_password}
        onClose={() => {
          onCreated({ ...created, organization: organization.trim() });
          setCreated(null);
        }}
      />
    );
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        createMutation.mutate();
      }}
    >
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="font-semibold">Новый клиент</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Телефон">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="996700999010"
            pattern="996\d{9}"
            required
            className="field-control"
          />
        </FormField>
        <FormField label="ФИО">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Асель Жумабекова"
            maxLength={200}
            required
            className="field-control"
          />
        </FormField>
        <FormField label="Организация (необязательно)">
          <input
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            maxLength={200}
            className="field-control"
          />
        </FormField>
        <FormField label="Город (необязательно)">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={100}
            className="field-control"
          />
        </FormField>
        <FormField label="Адрес (необязательно)" className="sm:col-span-2">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={500}
            className="field-control"
          />
        </FormField>
        <FormField label="Тип клиента" className="sm:col-span-2">
          <select
            value={clientType}
            onChange={(e) => setClientType(e.target.value)}
            className="field-control"
          >
            {CLIENT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Создание…" : "Создать клиента"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={createMutation.isPending}
          onClick={onCancel}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}
