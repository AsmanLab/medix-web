import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchContacts } from "@/api/cms";
import {
  createAdminContact,
  deleteAdminContact,
  updateAdminContact,
} from "@/api/cms-admin";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";

const fieldClass =
  "mt-1.5 flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type OfficeDraft = {
  key: string;
  /** id с сервера; null у офиса, который ещё не сохраняли. */
  id: string | null;
  name: string;
  address: string;
  phone_sales: string;
  phone_service: string;
  phone_accounting: string;
  working_hours: string;
  map_embed_url: string;
};

export function ContactsEditor() {
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: queryKeys.cms.contacts(),
    queryFn: ({ signal }) => fetchContacts(signal),
  });

  const [offices, setOffices] = useState<OfficeDraft[]>([]);

  useEffect(() => {
    if (!listQuery.data) return;
    setOffices(
      listQuery.data.map((o) => ({
        key: o.id,
        id: o.id,
        name: o.name,
        address: o.address ?? "",
        phone_sales: o.phone_sales ?? "",
        phone_service: o.phone_service ?? "",
        phone_accounting: o.phone_accounting ?? "",
        working_hours: o.working_hours ?? "",
        map_embed_url: o.map_embed_url ?? "",
      })),
    );
  }, [listQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const office of offices) {
        if (!office.name.trim()) {
          throw Object.assign(new Error("У офиса должно быть имя"), {
            status: 400,
            message: "У офиса должно быть имя",
          });
        }
        const payload = {
          name: office.name.trim(),
          address: office.address.trim(),
          phone_sales: office.phone_sales.trim(),
          phone_service: office.phone_service.trim(),
          phone_accounting: office.phone_accounting.trim(),
          working_hours: office.working_hours.trim(),
          map_embed_url: office.map_embed_url.trim(),
        };
        // Сохраняем по id, а не по имени: иначе переименование офиса
        // создавало второй, а исходный оставался на странице «Контакты».
        if (office.id) {
          await updateAdminContact(office.id, payload);
        } else {
          await createAdminContact(payload);
        }
      }
    },
    onSuccess: async () => {
      toast.success("Контакты сохранены");
      await queryClient.invalidateQueries({ queryKey: queryKeys.cms.contacts() });
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось сохранить");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminContact(id),
    onSuccess: async () => {
      toast.success("Офис удалён");
      await queryClient.invalidateQueries({ queryKey: queryKeys.cms.contacts() });
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось удалить");
    },
  });

  function removeOffice(office: OfficeDraft) {
    // Несохранённый офис убираем из формы — на сервере его ещё нет.
    if (!office.id) {
      setOffices((prev) => prev.filter((o) => o.key !== office.key));
      return;
    }
    if (
      window.confirm(
        `Удалить офис «${office.name || "без названия"}»? Он исчезнет со страницы «Контакты».`,
      )
    ) {
      deleteMutation.mutate(office.id);
    }
  }

  function updateOffice(key: string, patch: Partial<OfficeDraft>) {
    setOffices((prev) =>
      prev.map((o) => (o.key === key ? { ...o, ...patch } : o)),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Контакты</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Офисы на публичной странице /contacts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              setOffices((prev) => [
                ...prev,
                {
                  key: `new-${Date.now()}`,
                  id: null,
                  name: "",
                  address: "",
                  phone_sales: "",
                  phone_service: "",
                  phone_accounting: "",
                  working_hours: "",
                  map_embed_url: "",
                },
              ])
            }
          >
            <Plus className="h-4 w-4" aria-hidden />
            Офис
          </Button>
          <Button
            disabled={saveMutation.isPending || offices.length === 0}
            onClick={() => saveMutation.mutate()}
          >
            <Save className="h-4 w-4" aria-hidden />
            Сохранить все
          </Button>
        </div>
      </div>

      <StateBlock
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        error={listQuery.error}
        onRetry={() => void listQuery.refetch()}
        isEmpty={!listQuery.isLoading && offices.length === 0}
        emptyTitle="Нет офисов"
        emptyDescription="Добавьте офис кнопкой выше"
      >
        <div className="space-y-4">
          {offices.map((office) => (
            <section
              key={office.key}
              className="space-y-3 rounded-3xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <label className="block flex-1 text-xs font-semibold">
                  Название офиса
                  <input
                    value={office.name}
                    onChange={(e) =>
                      updateOffice(office.key, { name: e.target.value })
                    }
                    className={fieldClass}
                  />
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-5 text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => removeOffice(office)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Удалить
                </Button>
              </div>
              <label className="block text-xs font-semibold">
                Адрес
                <textarea
                  value={office.address}
                  onChange={(e) =>
                    updateOffice(office.key, { address: e.target.value })
                  }
                  className="mt-1.5 min-h-[72px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs font-semibold">
                  Тел. продажи
                  <input
                    value={office.phone_sales}
                    onChange={(e) =>
                      updateOffice(office.key, { phone_sales: e.target.value })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="block text-xs font-semibold">
                  Тел. сервис
                  <input
                    value={office.phone_service}
                    onChange={(e) =>
                      updateOffice(office.key, {
                        phone_service: e.target.value,
                      })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="block text-xs font-semibold">
                  Тел. бухгалтерия
                  <input
                    value={office.phone_accounting}
                    onChange={(e) =>
                      updateOffice(office.key, {
                        phone_accounting: e.target.value,
                      })
                    }
                    className={fieldClass}
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold">
                Часы работы
                <input
                  value={office.working_hours}
                  onChange={(e) =>
                    updateOffice(office.key, { working_hours: e.target.value })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="block text-xs font-semibold">
                Map embed URL
                <input
                  value={office.map_embed_url}
                  onChange={(e) =>
                    updateOffice(office.key, { map_embed_url: e.target.value })
                  }
                  className={fieldClass}
                />
              </label>
            </section>
          ))}
        </div>
      </StateBlock>
    </div>
  );
}
