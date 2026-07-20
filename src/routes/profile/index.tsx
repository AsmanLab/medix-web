import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "@/api/profile";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const profileQuery = useQuery({
    queryKey: queryKeys.profile.current(),
    queryFn: ({ signal }) => fetchProfile(signal),
    staleTime: 30_000,
    retry: (count, err: unknown) => {
      if (isAppError(err) && err.status === 401) return false;
      return count < 1;
    },
  });

  const api = profileQuery.data;
  const displayName =
    api?.full_name?.trim() ||
    (profileQuery.isLoading ? "Загрузка…" : "Имя не указано");
  const orgLine = [api?.organization?.trim(), api?.city?.trim()]
    .filter(Boolean)
    .join(", ");
  const verification = api?.verification_status ?? "unverified";

  const queryError = profileQuery.error;
  if (
    profileQuery.isError &&
    isAppError(queryError) &&
    queryError.status === 401
  ) {
    void navigate({
      to: "/login",
      search: { redirect: "/profile", phone: undefined },
    });
  }

  return (
    <AppShell>
      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-2xl font-bold">{displayName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {orgLine || "Организация не указана"}
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Статус:{" "}
          <span className="text-foreground">
            {verification === "verified"
              ? "Проверен"
              : verification === "pending"
                ? "На проверке"
                : verification === "rejected"
                  ? "Отклонён"
                  : "Не подтверждён"}
          </span>
        </p>
        {profileQuery.isError ? (
          <button
            type="button"
            className="mt-3 text-xs font-semibold text-destructive"
            onClick={() => void profileQuery.refetch()}
          >
            Не удалось загрузить профиль — повторить
          </button>
        ) : null}
      </div>

      {verification !== "verified" && api ? (
        <div className="mt-4 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-amber-950">
          <p className="font-semibold">Проверка организации</p>
          <p className="mt-1 text-xs leading-5 text-amber-900/75">
            Пока проверка не завершена, доступны запросы цены (RFQ). Прямой заказ
            откроется после подтверждения.
          </p>
        </div>
      ) : null}

      <div className="mt-6">
        {profileQuery.isLoading ? <StateBlock isLoading /> : null}
      </div>
    </AppShell>
  );
}
