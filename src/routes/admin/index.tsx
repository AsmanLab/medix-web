import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

function AdminHome() {
  return (
    <div className="rounded-3xl border border-border bg-card p-8 text-center">
      <h1 className="font-display text-2xl font-bold">Панель администратора</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Заглушка G0–G3. Каталог и CMS появятся на следующих этапах.
      </p>
    </div>
  );
}
