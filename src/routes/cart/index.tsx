import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  checkoutCart,
  fetchCart,
  groupCartItems,
  removeCartItem,
  setCartItemQty,
  type CartOut,
} from "@/api/cart";
import { isAppError } from "@/api/errors";
import { fetchManagers } from "@/api/managers";
import { fetchProfile } from "@/api/profile";
import { formatMoney } from "@/lib/money";
import { plural } from "@/lib/plural";
import { queryKeys } from "@/api/query-keys";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { useSession } from "@/session/store";
import { usePageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/cart/")({
  component: CartPage,
});

/**
 * Корзина хранится на сервере — это черновик запроса (ТЗ v2.0 §5.3).
 *
 * Развилку «заказ или запрос» принимает сервер в POST /cart/checkout, здесь
 * она только показывается: клиент не должен угадывать исход, он ветвится
 * по полю `type` в ответе.
 */
function CartPage() {
  usePageMeta({ title: "Корзина", description: null });

  const session = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [managerId, setManagerId] = useState("");
  const [showVerifyGate, setShowVerifyGate] = useState(false);
  const verifyGateRef = useRef<HTMLDivElement>(null);

  const authenticated = session.status === "authenticated";

  useEffect(() => {
    if (!showVerifyGate) return;

    verifyGateRef.current?.focus();

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowVerifyGate(false);
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showVerifyGate]);

  const cartQuery = useQuery({
    queryKey: queryKeys.cart.detail(),
    queryFn: ({ signal }) => fetchCart(signal),
    enabled: authenticated,
  });

  const profileQuery = useQuery({
    queryKey: queryKeys.profile.current(),
    queryFn: ({ signal }) => fetchProfile(signal),
    enabled: authenticated,
    staleTime: 30_000,
  });

  // Список меняется редко — держим подольше, чтобы не дёргать его на каждый
  // заход в корзину.
  const managersQuery = useQuery({
    queryKey: queryKeys.managers.list(),
    queryFn: ({ signal }) => fetchManagers(signal),
    enabled: authenticated,
    staleTime: 5 * 60_000,
  });

  const cart = cartQuery.data;
  const groups = groupCartItems(cart);
  const isVerified = profileQuery.data?.verification_status === "verified";
  const hasPriceless = cart?.has_priceless ?? false;
  const hasUnavailable = cart?.has_unavailable ?? false;
  const isEmpty = groups.length === 0;

  /** Что произойдёт при оформлении — только для подписи, решает сервер. */
  const willBeOrder = isVerified && !hasPriceless && !isEmpty;

  function applyCart(next: CartOut) {
    queryClient.setQueryData(queryKeys.cart.detail(), next);
  }

  function onMutationError(err: unknown, fallback: string) {
    toast.error(isAppError(err) ? err.message : fallback);
    void cartQuery.refetch();
  }

  /*
   * Количество меняется оптимистично: раньше каждое нажатие «+» ждало ответа
   * сервера и на это время гасило всю страницу через `busy`, поэтому набрать
   * пять штук значило пять раз ткнуть и подождать. Теперь цифра меняется
   * сразу, а при ошибке корзина перечитывается — сервер остаётся источником
   * истины, но не держит палец.
   */
  const qtyMutation = useMutation({
    mutationFn: ({ lineId, qty }: { lineId: string; qty: number }) =>
      setCartItemQty(lineId, qty),
    onMutate: ({ lineId, qty }) => {
      const previous = queryClient.getQueryData<CartOut>(
        queryKeys.cart.detail(),
      );
      if (previous) {
        // Опции считаются на единицу базовой позиции и едут за ней —
        // так же, как это делает сервер в set_cart_item_qty.
        queryClient.setQueryData<CartOut>(queryKeys.cart.detail(), {
          ...previous,
          items: previous.items.map((item) =>
            item.id === lineId || item.parent_line_id === lineId
              ? { ...item, qty }
              : item,
          ),
        });
      }
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.cart.detail(), context.previous);
      }
      onMutationError(err, "Не удалось изменить количество");
    },
    onSuccess: applyCart,
  });

  const removeMutation = useMutation({
    mutationFn: (lineId: string) => removeCartItem(lineId),
    onSuccess: applyCart,
    onError: (err) => onMutationError(err, "Не удалось убрать позицию"),
  });

  const checkoutMutation = useMutation({
    mutationFn: (forceRfq: boolean) =>
      checkoutCart({
        comment: comment.trim() || null,
        managerId: managerId || null,
        forceRfq,
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.rfq.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      setShowVerifyGate(false);
      if (result.type === "order") {
        toast.success("Заказ оформлен");
        await navigate({
          to: "/orders/$orderId",
          params: { orderId: result.id },
        });
      } else {
        toast.success("Запрос отправлен менеджеру");
        await navigate({ to: "/cart/success", search: { rfqId: result.id } });
      }
    },
    onError: (err) =>
      toast.error(isAppError(err) ? err.message : "Не удалось оформить"),
  });

  // Оформление и удаление блокируют страницу, изменение количества — нет:
  // оно применяется оптимистично и повторного клика не боится.
  const busy = removeMutation.isPending || checkoutMutation.isPending;

  function onPrimaryClick() {
    if (isEmpty || busy) return;
    // Неверифицированному объясняем, что уйдёт запрос, а не заказ, — иначе
    // кнопка «Оформить» молча делает не то, чего он ждёт.
    if (!isVerified && !hasPriceless) {
      setShowVerifyGate(true);
      return;
    }
    checkoutMutation.mutate(false);
  }

  if (!authenticated) {
    return (
      <AppShell>
        <h1 className="font-display text-3xl font-bold">Корзина</h1>
        <div className="mt-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
            <ShoppingCart className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Войдите в аккаунт</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Корзина хранится в вашем аккаунте, поэтому доступна с любого
            устройства.
          </p>
          <Link
            to="/login"
            search={{ redirect: "/cart", phone: undefined }}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Войти <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell width="wide">
      <h1 className="font-display text-3xl font-bold">Корзина</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {cartQuery.isPending
          ? "Загружаем…"
          : isEmpty
            ? "Добавьте оборудование из каталога"
            : plural(groups.length, "позиция", "позиции", "позиций")}
      </p>

      {cartQuery.isError ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-destructive">
            Не удалось загрузить корзину
          </p>
          <Button className="mt-3" onClick={() => void cartQuery.refetch()}>
            Повторить
          </Button>
        </div>
      ) : null}

      {!cartQuery.isPending && !cartQuery.isError && isEmpty ? (
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
      ) : null}

      {!isEmpty ? (
        /*
         * Две колонки на десктопе: слева позиции, справа липкий итог
         * с кнопками оформления. В одну колонку итог уезжал под список,
         * и при пяти позициях с комплектациями кнопка «Оформить» уходила
         * за пределы экрана — приходилось скроллить вниз, чтобы увидеть
         * сумму, и вверх, чтобы поправить количество.
         */
        <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
          <div className="space-y-6 lg:col-start-1">
            {hasUnavailable ? (
              <div className="flex items-start gap-2.5 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                  aria-hidden
                />
                <p className="text-sm text-muted-foreground">
                  Отмеченные позиции больше не продаются — уберите их, чтобы
                  оформить корзину.
                </p>
              </div>
            ) : null}

            <ul className="space-y-3">
              {groups.map(({ base, options }) => (
                <li
                  key={base.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{base.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Арт. {base.sku}
                    </p>
                    {!base.is_available ? (
                      <p className="mt-1 text-xs font-semibold text-destructive">
                        Товар снят с продажи
                      </p>
                    ) : null}
                    {options.length > 0 ? (
                      <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        {options.map((o) => (
                          <li key={o.id}>
                            + {o.name}
                            {o.unit_price
                              ? ` · ${formatMoney(o.unit_price)}`
                              : " · по запросу"}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="mt-2 text-sm font-semibold text-primary">
                      {formatMoney(base.line_total, "Цена по запросу")}
                    </p>
                  </div>
                  {/* 44px — минимальный тач-таргет из MASTER.md; кнопки
                      были 36px, и на телефоне «+» задевал «−». */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Уменьшить количество: ${base.name}`}
                      disabled={busy || base.qty <= 1}
                      className="grid h-11 w-11 place-items-center rounded-xl border border-border disabled:opacity-40"
                      onClick={() =>
                        qtyMutation.mutate({
                          lineId: base.id,
                          qty: base.qty - 1,
                        })
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span
                      aria-live="polite"
                      className="w-8 text-center text-sm font-semibold tabular-nums"
                    >
                      {base.qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Увеличить количество: ${base.name}`}
                      disabled={busy}
                      className="grid h-11 w-11 place-items-center rounded-xl border border-border disabled:opacity-40"
                      onClick={() =>
                        qtyMutation.mutate({
                          lineId: base.id,
                          qty: base.qty + 1,
                        })
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Убрать из корзины: ${base.name}`}
                      disabled={busy}
                      className="ml-1 grid h-11 w-11 place-items-center rounded-xl text-destructive disabled:opacity-40"
                      onClick={() => removeMutation.mutate(base.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {managersQuery.data && managersQuery.data.length > 0 ? (
              <section>
                <label
                  className="block text-sm font-semibold"
                  htmlFor="rfq-manager"
                >
                  Менеджер{" "}
                  <span className="font-normal text-muted-foreground">
                    (необязательно)
                  </span>
                </label>
                <select
                  id="rfq-manager"
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="field-control mt-2"
                  disabled={busy}
                >
                  <option value="">Любой свободный менеджер</option>
                  {managersQuery.data.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || "Без имени"}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Если вы уже работаете с кем-то из отдела продаж, выберите его
                  — заявка попадёт сразу к нему.
                </p>
              </section>
            ) : null}

            <section>
              <label
                className="block text-sm font-semibold"
                htmlFor="rfq-comment"
              >
                Комментарий{" "}
                <span className="font-normal text-muted-foreground">
                  (необязательно, уйдёт с запросом КП)
                </span>
              </label>
              {/*
              Поле было disabled, когда оформление ведёт к заказу, — но рядом
              стоит кнопка «Всё же запросить КП», которая этот комментарий
              отправляет. Написать его было физически нельзя.
            */}
              <textarea
                id="rfq-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Сроки, комплектация, адрес доставки…"
                className="field-control mt-2 min-h-[96px] resize-y"
                disabled={busy}
              />
              {willBeOrder ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  К прямому заказу комментарий не прикладывается — он уйдёт,
                  если выбрать «Всё же запросить КП».
                </p>
              ) : null}
            </section>
          </div>

          <aside className="mt-8 lg:col-start-2 lg:mt-0 lg:sticky lg:top-24">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <h2 className="font-semibold">Итого</h2>
              <p className="mt-3 text-2xl font-bold text-primary">
                {formatMoney(cart?.total, "Цена по запросу")}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {willBeOrder
                  ? "Организация подтверждена — можно оформить заказ с ценами из каталога."
                  : hasPriceless
                    ? "Есть позиции без цены — менеджер подготовит коммерческое предложение (КП)."
                    : "После подтверждения организации станет доступен прямой заказ. Сейчас можно отправить запрос на КП."}
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <Button
                  className="h-12 w-full"
                  disabled={busy || hasUnavailable}
                  onClick={onPrimaryClick}
                >
                  {checkoutMutation.isPending
                    ? "Отправка…"
                    : willBeOrder
                      ? "Оформить заказ"
                      : "Отправить запрос на КП"}
                </Button>
                {willBeOrder ? (
                  <Button
                    variant="outline"
                    className="h-12 w-full"
                    disabled={busy || hasUnavailable}
                    onClick={() => checkoutMutation.mutate(true)}
                  >
                    Всё же запросить КП
                  </Button>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      ) : null}

      {showVerifyGate ? (
        /*
          Диалог не вёл себя как диалог: Escape его не закрывал, клик по фону
          тоже, фокус оставался на кнопке под подложкой, а страница за ним
          продолжала скроллиться.
        */
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowVerifyGate(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-gate-title"
            ref={verifyGateRef}
            tabIndex={-1}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] outline-none"
          >
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
              <Button
                disabled={busy}
                onClick={() => checkoutMutation.mutate(false)}
              >
                {checkoutMutation.isPending ? "Отправка…" : "Отправить запрос"}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
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
