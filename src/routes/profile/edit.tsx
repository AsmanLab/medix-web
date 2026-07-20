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
import { writeLastPhone } from "@/features/profile/labels";

export const Route = createFileRoute("/profile/edit")({
  component: ProfileEditPage,
});

function ProfileEditPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const profileQuery = useQuery({
    queryKey: queryKeys.profile.current(),
    queryFn: ({ signal }) => fetchProfile(signal),
  });

  useEffect(() => {
    if (profileQuery.data) {
      setFullName(profileQuery.data.full_name ?? "");
      setPhone(profileQuery.data.phone ?? "");
      if (profileQuery.data.phone) {
        writeLastPhone(profileQuery.data.phone);
      }
    }
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateProfile({
        full_name: fullName.trim() || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      toast.success("Личные данные сохранены");
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
      <h1 className="mt-4 font-display text-2xl font-bold">Личные данные</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Как к вам обращаться в заявках и счетах
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
              if (!fullName.trim()) {
                toast.error("Укажите ФИО");
                return;
              }
              saveMutation.mutate();
            }}
          >
            <label className="block">
              <span className="text-sm font-semibold">ФИО</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="field-control mt-1.5"
                placeholder="Иванов Иван Иванович"
                autoComplete="name"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Телефон</span>
              <input
                value={phone}
                readOnly
                className="field-control mt-1.5 bg-muted/40 text-muted-foreground"
                placeholder="—"
                inputMode="tel"
                autoComplete="tel"
              />
              <span className="mt-1.5 block text-xs text-muted-foreground">
                Номер привязан к аккаунту и не меняется здесь. Для смены пароля
                используйте раздел «Безопасность».
              </span>
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
