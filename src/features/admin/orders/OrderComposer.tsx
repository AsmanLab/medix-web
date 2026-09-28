import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { isAppError } from "@/api/errors";
import {
  createManagerOrder,
  type ManagerOrderItemInput,
} from "@/api/manager-orders";
import { queryKeys } from "@/api/query-keys";
import { Button } from "@/components/ui/button";
import { formatAmount, parseMoney } from "@/lib/money";

export type OrderLineDraft = {
  key: string;
  product_id: string;
  sku: string;
  name: string;
  qty: number;
  option_type: string | null;
  parent_product_id: string | null;
  /** Цена из каталога — только для подсказки, не отправляется на сервер. */
  catalogPrice: string | null;
  /** Ручная цена. Пусто — сервер возьмёт цену каталога. */
  unitPriceAmount: string;
};

export type OrderComposerClient = {
  user_id: string;
  full_name: string;
  phone: string;
};

type OrderComposerProps = {
  client: OrderComposerClient | null;
  items: OrderLineDraft[];
  onItemsChange: (items: OrderLineDraft[]) => void;
};

/** Разобранная цена позиции: ручная — как есть, иначе цена каталога. */
function lineUnitPrice(line: OrderLineDraft): ReturnType<typeof parseMoney> {
  const manual = line.unitPriceAmount.trim();
  if (manual) return parseMoney(manual);
  return parseMoney(line.catalogPrice);
}

/**
 * Таблица позиций, поля доставки/комментария и отправка заказа — либо
 * «Оформить заказ» (сразу заказ, минуя проверку верификации клиента),
 * либо «Отправить как КП» (`as_quote`, создаёт RFQ для клиента).
 */
export function OrderComposer({
  client,
  items,
  onItemsChange,
}: OrderComposerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [comment, setComment] = useState("");

  function updateLine(key: string, patch: Partial<OrderLineDraft>) {
    onItemsChange(
      items.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(key: string) {
    onItemsChange(items.filter((line) => line.key !== key));
  }

  function validate(): string | null {
    if (!client) return "Выберите или создайте клиента";
    if (items.length === 0) return "Добавьте хотя бы одну позицию";
    const withoutPrice = items.find(
      (line) => !line.unitPriceAmount.trim() && !line.catalogPrice,
    );
    if (withoutPrice) {
      return `Укажите цену для позиции «${withoutPrice.name}»`;
    }
    return null;
  }

  function buildItems(): ManagerOrderItemInput[] {
    return items.map((line) => ({
      product_id: line.product_id,
      qty: line.qty,
      option_type: line.option_type,
      parent_product_id: line.parent_product_id,
      unit_price_amount: line.unitPriceAmount.trim() || undefined,
    }));
  }

  const submitMutation = useMutation({
    mutationFn: async (asQuote: boolean) => {
      const error = validate();
      if (error) {
        throw Object.assign(new Error(error), { message: error });
      }
      return createManagerOrder({
        client_id: client!.user_id,
        items: buildItems(),
        delivery_address: deliveryAddress.trim(),
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim(),
        comment: comment.trim(),
        as_quote: asQuote,
      });
    },
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.managerOrders.all,
      });
      if (res.type === "rfq") {
        toast.success("Запрос КП создан");
        await navigate({ to: "/admin/commerce/$rfqId", params: { rfqId: res.id } });
      } else {
        toast.success("Заказ создан");
        await navigate({ to: "/admin/orders/$orderId", params: { orderId: res.id } });
      }
    },
    onError: (err) => {
      toast.error(isAppError(err) ? err.message : "Не удалось оформить заказ");
    },
  });

  let total = 0;
  let currency = "KGS";
  for (const line of items) {
    const price = lineUnitPrice(line);
    if (!price) continue;
    total += price.amount * line.qty;
    currency = price.currency || currency;
  }

  const busy = submitMutation.isPending;

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
      <h2 className="text-sm font-bold">Состав заказа</h2>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Добавьте товары через поиск выше.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((line) => (
            <div
              key={line.key}
              className="grid gap-2 rounded-2xl border border-border p-3 sm:grid-cols-[minmax(0,1fr)_90px_130px_36px]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{line.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {line.sku}
                  {line.option_type ? ` · ${line.option_type}` : ""}
                </p>
              </div>
              <label className="text-[10px] font-semibold uppercase text-muted-foreground">
                Кол-во
                <input
                  type="number"
                  min={1}
                  value={line.qty}
                  onChange={(e) =>
                    updateLine(line.key, { qty: Number(e.target.value) || 1 })
                  }
                  className="field-control mt-1.5"
                />
              </label>
              <label className="text-[10px] font-semibold uppercase text-muted-foreground">
                Цена
                <input
                  value={line.unitPriceAmount}
                  placeholder={line.catalogPrice ?? "укажите цену"}
                  onChange={(e) =>
                    updateLine(line.key, { unitPriceAmount: e.target.value })
                  }
                  className="field-control mt-1.5"
                />
              </label>
              <button
                type="button"
                aria-label="Удалить позицию"
                className="mt-6 grid h-10 w-9 place-items-center text-destructive"
                onClick={() => removeLine(line.key)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm font-semibold">
        Итого: {total > 0 ? formatAmount(total, currency) : "—"}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold">
          Адрес доставки
          <input
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Бишкек, ул. …"
            className="field-control mt-1.5"
          />
        </label>
        <label className="text-xs font-semibold">
          Контактный телефон
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="996700999010"
            className="field-control mt-1.5"
          />
        </label>
        <label className="text-xs font-semibold">
          Контактное лицо
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="field-control mt-1.5"
          />
        </label>
        <label className="text-xs font-semibold sm:col-span-2">
          Комментарий
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-1.5 min-h-[88px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={busy}
          onClick={() => submitMutation.mutate(false)}
        >
          {busy ? "Оформляем…" : "Оформить заказ"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => submitMutation.mutate(true)}
        >
          {busy ? "Отправляем…" : "Отправить как КП"}
        </Button>
      </div>
    </div>
  );
}
