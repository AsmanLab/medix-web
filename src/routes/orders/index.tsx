import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shared/AppShell";
import { StateBlock } from "@/components/shared/StateBlock";

export const Route = createFileRoute("/orders/")({
  component: OrdersPage,
});

function OrdersPage() {
  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">Заказы</h1>
      <p className="mt-2 text-sm text-muted-foreground">Скоро</p>
      <div className="mt-8">
        <StateBlock
          isEmpty
          emptyTitle="Пока нет заказов"
          emptyDescription="История заказов появится на следующих этапах."
        />
      </div>
    </AppShell>
  );
}
