import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { isAppError } from "@/api/errors";
import { placeOrderFromCart } from "@/api/orders";
import { fetchProfile } from "@/api/profile";
import { submitRfqFromCart } from "@/api/rfq";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { rfqCartStore, useRfqCart } from "@/features/rfq/cart-store";
import { useSession } from "@/session/store";

export const Route = createFileRoute("/cart/")({
  component: CartPage,
});

function CartPage() {
  const cart = useRfqCart();
  const session = useSession();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showVerifyGate, setShowVerifyGate] = useState(false);

  const profileQuery = useQuery({
    queryKey: queryKeys.profile.current(),
    queryFn: ({ signal }) => fetchProfile(signal),
    enabled: session.status === "authenticated",
    staleTime: 30_000,
  });

  const verification = profileQuery.data?.verification_status ?? "unverified";
  const isVerified = verification === "verified";
  const totalQty = cart.items.reduce((s, i) => s + i.qty, 0);
  const hasPriceless =
    cart.items.some((i) => !i.unitPriceAmount) ||
    cart.items.some((i) => i.options.some((o) => !o.unitPriceAmount));

  /** Verified + all priced → direct order; otherwise RFQ. */
  const canDirectOrder = isVerified && !hasPriceless && cart.items.length > 0;

  async function doSubmitRfq() {
    if (cart.items.length === 0 || submitting) return;

    if (session.status !== "authenticated") {
      toast.message("Войдите, чтобы отправить запрос");
      await navigate({
        to: "/login",
        search: { redirect: "/cart", phone: undefined },
      });
      return;
    }

    setSubmitting(true);
    try {
      const rfqId = await submitRfqFromCart({
        items: cart.items.map((i) => ({
          productId: i.productId,
          sku: i.sku,
          name: i.name,
          qty: i.qty,
          unitPriceAmount: i.unitPriceAmount,
          options: i.options.map((o) => ({
            optionId: o.optionId,
            name: o.name,
            sku: o.sku,
            optionType: o.optionType,
            unitPriceAmount: o.unitPriceAmount,
          })),
        })),
      });
      rfqCartStore.clear();
      toast.success("Запрос отправлен менеджеру");
      await navigate({
        to: "/cart/success",
        search: { rfqId },
      });
    } catch (err) {
      toast.error(
        isAppError(err) ? err.message : "Не удалось отправить запрос",
      );
    } finally {
      setSubmitting(false);
      setShowVerifyGate(false);
    }
  }

  async function doPlaceOrder() {
    if (!canDirectOrder || submitting) return;
    if (session.status !== "authenticated") {
      toast.message("Войдите, чтобы оформить заказ");
      await navigate({
        to: "/login",
        search: { redirect: "/cart", phone: undefined },
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await placeOrderFromCart({
        items: cart.items.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          options: i.options.map((o) => ({
            optionId: o.optionId,
            optionType: o.optionType,
          })),
        })),
      });
      rfqCartStore.clear();
      if (result.type === "order") {
        toast.success("Заказ оформлен");
        await navigate({
          to: "/orders/$orderId",
          params: { orderId: result.id },
        });
      } else {
        toast.message("Оформлен запрос — менеджер подготовит КП");
        await navigate({
          to: "/cart/success",
          search: { rfqId: result.id },
        });
      }
    } catch (err) {
      toast.error(
        isAppError(err) ? err.message : "Не удалось оформить заказ",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function onPrimaryClick() {
    if (cart.items.length === 0 || submitting) return;
    if (canDirectOrder) {
      void doPlaceOrder();
      return;
    }
    if (session.status === "authenticated" && !isVerified) {
      setShowVerifyGate(true);
      return;
    }
    void doSubmitRfq();
  }

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">Корзина</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {cart.items.length
          ? `${cart.items.length} позиций · ${totalQty} ед.`
          : "Добавьте оборудование из каталога"}
      </p>

      {cart.items.length === 0 ? (
        <div className="mt-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
            <ShoppingCart className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Корзина пуста</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Выберите позиции в каталоге. После проверки организации можно
            оформить заказ сразу; иначе менеджер подготовит коммерческое
            предложение.
          </p>
          <Link
            to="/catalog"
            search={{ q: undefined }}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Перейти в каталог <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <ul className="space-y-3">
            {cart.items.map((item) => (
              <li
                key={item.lineKey}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    to="/product/$slug"
                    params={{ slug: item.slug }}
                    className="font-semibold hover:text-primary"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Арт. {item.sku}
                  </p>
                  {item.options.length > 0 ? (
                    <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      {item.options.map((o) => (
                        <li key={o.optionId}>
                          + {o.name}
                          {o.priceLabel ? ` · ${o.priceLabel}` : " · по запросу"}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="mt-2 text-sm font-semibold text-primary">
                    {item.priceLabel ?? "Цена по запросу"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Уменьшить"
                    className="grid h-9 w-9 place-items-center rounded-xl border border-border"
                    onClick={() =>
                      rfqCartStore.setQty(item.lineKey, item.qty - 1)
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    aria-label="Увеличить"
                    className="grid h-9 w-9 place-items-center rounded-xl border border-border"
                    onClick={() =>
                      rfqCartStore.setQty(item.lineKey, item.qty + 1)
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Удалить"
                    className="ml-1 grid h-9 w-9 place-items-center rounded-xl text-destructive"
                    onClick={() => rfqCartStore.remove(item.lineKey)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">Итого</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {canDirectOrder
                ? "Организация подтверждена — можно оформить заказ с ценами из каталога."
                : hasPriceless
                  ? "Есть позиции без цены — менеджер подготовит коммерческое предложение (КП)."
                  : !isVerified
                    ? "После подтверждения организации станет доступен прямой заказ. Сейчас можно отправить запрос на КП."
                    : "Сумма будет подтверждена в КП."}
            </p>
            <p className="mt-3 text-lg font-bold text-primary">
              {canDirectOrder
                ? "Готово к заказу"
                : hasPriceless
                  ? "Цена по запросу"
                  : "Запрос / котировка"}
            </p>
          </section>

          <section>
            <label className="block text-sm font-semibold" htmlFor="rfq-comment">
              Комментарий{" "}
              <span className="font-normal text-muted-foreground">
                (необязательно, для запроса КП)
              </span>
            </label>
            <textarea
              id="rfq-comment"
              value={cart.comment}
              onChange={(e) => rfqCartStore.setComment(e.target.value)}
              rows={3}
              placeholder="Сроки, комплектация, адрес доставки…"
              className="field-control mt-2 min-h-[96px] resize-y"
              disabled={canDirectOrder}
            />
          </section>

          <div className="flex flex-wrap gap-3">
            <Button
              className="h-12 w-full sm:w-auto"
              disabled={submitting}
              onClick={onPrimaryClick}
            >
              {submitting
                ? "Отправка…"
                : canDirectOrder
                  ? "Оформить заказ"
                  : "Отправить запрос на КП"}
            </Button>
            {canDirectOrder ? (
              <Button
                variant="outline"
                className="h-12 w-full sm:w-auto"
                disabled={submitting}
                onClick={() => void doSubmitRfq()}
              >
                Всё же запросить КП
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {showVerifyGate ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verify-gate-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2
              id="verify-gate-title"
              className="font-display text-xl font-bold"
            >
              Организация ещё не подтверждена
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Запрос на коммерческое предложение можно отправить сейчас —
              менеджер свяжется с вами. Прямой заказ с ценами каталога станет
              доступен после проверки организации (или автоматически при
              принятии КП).
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button disabled={submitting} onClick={() => void doSubmitRfq()}>
                {submitting ? "Отправка…" : "Отправить запрос"}
              </Button>
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => setShowVerifyGate(false)}
              >
                Отмена
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
