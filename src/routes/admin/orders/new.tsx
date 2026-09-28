import { createFileRoute, Link } from "@tanstack/react-router";
import { PackagePlus } from "lucide-react";
import { useState } from "react";
import type { ManagerCustomer } from "@/api/customers";
import type { ProductListOut } from "@/api/catalog";
import { Button } from "@/components/ui/button";
import { ClientPicker } from "@/features/admin/orders/ClientPicker";
import {
  NewClientForm,
  type CreatedOrderClient,
} from "@/features/admin/orders/NewClientForm";
import { ProductPicker } from "@/features/admin/orders/ProductPicker";
import {
  OrderComposer,
  type OrderComposerClient,
  type OrderLineDraft,
} from "@/features/admin/orders/OrderComposer";
import { requireStaffPanel } from "@/session/guards";

export const Route = createFileRoute("/admin/orders/new")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin", "manager"] }),
  component: NewManagerOrderPage,
});

function NewManagerOrderPage() {
  const [client, setClient] = useState<OrderComposerClient | null>(null);
  const [clientOrganization, setClientOrganization] = useState("");
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [items, setItems] = useState<OrderLineDraft[]>([]);

  function onSelectExisting(customer: ManagerCustomer) {
    setClient({
      user_id: customer.user_id,
      full_name: customer.full_name,
      phone: customer.phone ?? "",
    });
    setClientOrganization(customer.organization);
    setShowNewClientForm(false);
  }

  function onClientCreated(created: CreatedOrderClient) {
    setClient({
      user_id: created.user_id,
      full_name: created.full_name,
      phone: created.phone,
    });
    setClientOrganization(created.organization);
    setShowNewClientForm(false);
  }

  function onAddProduct(product: ProductListOut) {
    setItems((prev) => {
      const existing = prev.find(
        (line) => line.product_id === product.id && !line.option_type,
      );
      if (existing) {
        return prev.map((line) =>
          line.key === existing.key ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      return [
        ...prev,
        {
          key: `${product.id}-${Date.now()}`,
          product_id: product.id,
          sku: product.sku,
          name: product.name,
          qty: 1,
          option_type: null,
          parent_product_id: null,
          catalogPrice: product.price,
          unitPriceAmount: "",
        },
      ];
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          К списку заказов
        </Link>
      </div>

      <header className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
          <PackagePlus className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Создать заказ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Оформление заказа по телефонному звонку клиента
          </p>
        </div>
      </header>

      <section className="space-y-4 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold">Клиент</h2>

        {client ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 p-4">
            <div>
              <p className="font-semibold">{client.full_name || "Без имени"}</p>
              <p className="text-sm text-muted-foreground">
                {[clientOrganization, client.phone]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setClient(null);
                setClientOrganization("");
              }}
            >
              Изменить
            </Button>
          </div>
        ) : showNewClientForm ? (
          <NewClientForm
            onCreated={onClientCreated}
            onCancel={() => setShowNewClientForm(false)}
          />
        ) : (
          <ClientPicker
            selectedUserId={null}
            onSelect={onSelectExisting}
            onRequestNewClient={() => setShowNewClientForm(true)}
          />
        )}
      </section>

      <section className="space-y-4 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold">Добавить товар</h2>
        <ProductPicker onAdd={onAddProduct} />
      </section>

      <OrderComposer client={client} items={items} onItemsChange={setItems} />
    </div>
  );
}
