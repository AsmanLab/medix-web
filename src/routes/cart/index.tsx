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

  async function doSubmit() {
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
      toast.success("Запрос отправлен");
      await navigate({
        to: "/cart/success",
        search: { rfqId },
      });
    } catch (err) {
      const message = isAppError(err)
        ? err.message
        : "Не удалось отправить запрос";
      toast.error(message);
    } finally {
      setSubmitting(false);
      setShowVerifyGate(false);
    }
  }

  function onSubmitClick() {
    if (cart.items.length === 0 || submitting) return;
    if (session.status === "authenticated" && !isVerified) {
      setShowVerifyGate(true);
      return;
    }
    void doSubmit();
  }

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">Корзина RFQ</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {cart.items.length
          ? `${cart.items.length} позиций · ${totalQty} ед.`
          : "Соберите запрос на расчёт стоимости"}
      </p>

      {cart.items.length === 0 ? (
        <div className="mt-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
            <ShoppingCart className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Здесь пока пусто</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Добавляйте товары из каталога, затем отправьте корзину менеджеру на
            расчёт.
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
              {hasPriceless
                ? "Цена по запросу — менеджер подготовит коммерческое предложение."
                : "Сумма будет подтверждена менеджером в котировке."}
            </p>
            <p className="mt-3 text-lg font-bold text-primary">
              {hasPriceless ? "Цена по запросу" : "По запросу / котировка"}
            </p>
          </section>

          <section>
            <label className="block text-sm font-semibold" htmlFor="rfq-comment">
              Комментарий{" "}
              <span className="font-normal text-muted-foreground">(необязательно)</span>
            </label>
            <textarea
              id="rfq-comment"
              value={cart.comment}
              onChange={(e) => rfqCartStore.setComment(e.target.value)}
              rows={3}
              placeholder="Сроки, комплектация, адрес доставки…"
              className="field-control mt-2 min-h-[96px] resize-y"
            />
          </section>

          <Button
            className="h-12 w-full sm:w-auto"
            disabled={submitting}
            onClick={onSubmitClick}
          >
            {submitting ? "Отправка…" : "Отправить запрос"}
          </Button>
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
            <h2 id="verify-gate-title" className="font-display text-xl font-bold">
              Аккаунт на проверке
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Ваша организация ещё не подтверждена. Запрос цены можно отправить —
              после отправки заявка на верификацию уйдёт администратору. Прямой
              заказ станет доступен после проверки.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                disabled={submitting}
                onClick={() => void doSubmit()}
              >
                {submitting ? "Отправка…" : "Отправить всё равно"}
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
