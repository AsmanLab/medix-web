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
import { CLIENT_TYPE_OPTIONS } from "@/features/profile/labels";

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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      toast.success("Данные организации сохранены");
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
        Используются для верификации, счетов и договоров
      </p>

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
              <span className="text-sm font-semibold">Название организации</span>
              <input
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="field-control mt-1.5"
                placeholder="Клиника «Авиценна»"
                autoComplete="organization"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Город</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="field-control mt-1.5"
                placeholder="Бишкек"
                autoComplete="address-level2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Адрес</span>
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
