import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isAppError } from "@/api/errors";
import { fetchProfile, updateProfile } from "@/api/profile";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import {
  CLIENT_TYPE_OPTIONS,
  verificationFieldsLabel,
} from "@/features/profile/labels";

export const Route = createFileRoute("/profile/organization")({
  component: ProfileOrganizationPage,
});

function ProfileOrganizationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [organization, setOrganization] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [clientType, setClientType] = useState("clinic");

  const profileQuery = useQuery({
    queryKey: queryKeys.profile.current(),
    queryFn: ({ signal }) => fetchProfile(signal),
  });

  const missing = profileQuery.data?.missing_for_verification ?? [];
  const orgRequired = clientType !== "individual";

  useEffect(() => {
    if (!profileQuery.data) return;
    setOrganization(profileQuery.data.organization ?? "");
    setCity(profileQuery.data.city ?? "");
    setAddress(profileQuery.data.address ?? "");
    setClientType(profileQuery.data.client_type || "clinic");
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateProfile({
        organization: organization.trim() || null,
        city: city.trim() || null,
        address: address.trim() || null,
        client_type: clientType || null,
      }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      const stillMissing = saved.missing_for_verification ?? [];
      if (stillMissing.length) {
        // Сервер не берёт профиль в проверку без этих полей — молча уводить
        // клиента на профиль значит повторить прежнюю немую заглушку.
        toast.warning(
          `Сохранено. Для проверки не хватает: ${verificationFieldsLabel(stillMissing)}`,
        );
        return;
      }
      if (saved.verification_status === "pending_verification") {
        toast.success("Данные отправлены на проверку менеджеру");
      } else {
        toast.success("Данные организации сохранены");
      }
      await navigate({ to: "/profile" });
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось сохранить");
    },
  });

  return (
    <AppShell>
      <Link
        to="/profile"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <ArrowLeft className="h-4 w-4" />К профилю
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold">Организация</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Используются для верификации, счетов и договоров. Когда обязательные
        поля заполнены, профиль уходит менеджеру на проверку.
      </p>
      {missing.length ? (
        <div className="mt-3 rounded-xl border border-warning/40 bg-warning-soft px-3 py-2 text-xs leading-5 text-warning-strong">
          Для проверки не хватает: {verificationFieldsLabel(missing)}
          {missing.includes("full_name") ? (
            // ФИО живёт на другой странице — иначе подсказка отправляет
            // искать поле, которого в этой форме нет.
            <>
              {". "}
              <Link
                to="/profile/edit"
                className="font-semibold underline underline-offset-2"
              >
                ФИО указывается в личных данных →
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6">
        <StateBlock
          isLoading={profileQuery.isLoading}
          isError={profileQuery.isError}
          error={profileQuery.error}
          onRetry={() => void profileQuery.refetch()}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <label className="block">
              <span className="text-sm font-semibold">Тип клиента</span>
              <select
                value={clientType}
                onChange={(e) => setClientType(e.target.value)}
                className="field-control mt-1.5"
              >
                {CLIENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">
                Название организации
                {orgRequired ? <RequiredHint /> : null}
              </span>
              <input
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="field-control mt-1.5"
                placeholder="Клиника «Авиценна»"
                autoComplete="organization"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">
                Город
                <RequiredHint />
              </span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="field-control mt-1.5"
                placeholder="Бишкек"
                autoComplete="address-level2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">
                Адрес
                <RequiredHint />
              </span>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="field-control mt-1.5 min-h-[88px] resize-y"
                placeholder="ул. Чуй 154"
                autoComplete="street-address"
              />
            </label>
            <Button
              type="submit"
              className="w-full"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Сохранение…" : "Сохранить"}
            </Button>
          </form>
        </StateBlock>
      </div>
    </AppShell>
  );
}

/** Поля, без которых менеджеру нечего проверять (п. 4.3 ТЗ). */
function RequiredHint() {
  return (
    <span className="ml-1 text-xs font-normal text-muted-foreground">
      · нужно для проверки
    </span>
  );
}
