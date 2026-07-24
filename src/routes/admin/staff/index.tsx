import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { isAppError } from "@/api/errors";
import { queryKeys } from "@/api/query-keys";
import {
  createStaffUser,
  deactivateStaffUser,
  listStaffUsers,
  type StaffRole,
} from "@/api/staff";
import { StateBlock } from "@/components/shared/StateBlock";
import { Button } from "@/components/ui/button";
import { requireStaffPanel } from "@/session/guards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/staff/")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: StaffAdminPage,
});

const fieldClass =
  "mt-1.5 flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const ROLE_LABEL: Record<StaffRole, string> = {
  manager: "Менеджер",
  service_engineer: "Инженер",
  admin: "Администратор",
};

function StaffAdminPage() {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("manager");
  const [includeInactive, setIncludeInactive] = useState(false);

  const staffQuery = useQuery({
    queryKey: queryKeys.staff.list(includeInactive),
    queryFn: ({ signal }) => listStaffUsers(includeInactive, signal),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createStaffUser({
        phone: phone.trim(),
        password,
        role,
      }),
    onSuccess: async () => {
      toast.success("Сотрудник создан");
      setPhone("");
      setPassword("");
      setRole("manager");
      await queryClient.invalidateQueries({ queryKey: queryKeys.staff.all });
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось создать");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => deactivateStaffUser(userId),
    onSuccess: async () => {
      toast.success("Сотрудник деактивирован");
      await queryClient.invalidateQueries({ queryKey: queryKeys.staff.all });
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось деактивировать");
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Admin
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold">Сотрудники</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Создание менеджеров, инженеров и администраторов
        </p>
      </header>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="font-semibold">Новый сотрудник</h2>
        </div>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <label className="text-xs font-semibold">
            Телефон
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="996700999010"
              pattern="996\d{9}"
              required
              className={fieldClass}
            />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
              Формат 996XXXXXXXXX
            </span>
          </label>
          <label className="text-xs font-semibold">
            Пароль
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold sm:col-span-2">
            Роль
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className={fieldClass}
            >
              <option value="manager">Менеджер</option>
              <option value="service_engineer">Инженер</option>
              <option value="admin">Администратор</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Создание…" : "Создать"}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold">Список</h2>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            Показывать неактивных
          </label>
        </div>

        <StateBlock
          isLoading={staffQuery.isLoading}
          isError={staffQuery.isError}
          error={staffQuery.error}
          isEmpty={staffQuery.isSuccess && (staffQuery.data?.length ?? 0) === 0}
          onRetry={() => void staffQuery.refetch()}
          emptyTitle="Сотрудников нет"
        >
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {(staffQuery.data ?? []).map((user) => (
              <li
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{user.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABEL[user.role as StaffRole] ?? user.role}
                    {!user.is_active ? " · неактивен" : ""}
                  </p>
                </div>
                {user.is_active ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deactivateMutation.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Деактивировать ${user.phone}? Вход станет недоступен.`,
                        )
                      ) {
                        deactivateMutation.mutate(user.id);
                      }
                    }}
                    className={cn("text-red-700")}
                  >
                    Деактивировать
                  </Button>
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">
                    Отключён
                  </span>
                )}
              </li>
            ))}
          </ul>
        </StateBlock>
      </section>
    </div>
  );
}
