import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { addToCart } from "@/api/cart";
import { isAppError } from "@/api/errors";
import type { OrderLineItem } from "@/api/orders";
import { queryKeys } from "@/api/query-keys";
import { orderToCartAdditions } from "@/features/orders/repeat-order";
import { plural } from "@/lib/plural";
import { useT } from "@/i18n/LocaleProvider";

/**
 * Кладёт позиции прошлого заказа в корзину и ведёт в неё.
 *
 * Позиции добавляются по одной, а не через Promise.all: корзина на сервере
 * одна, каждый запрос читает её целиком и перезаписывает — параллельные
 * добавления затирали бы друг друга.
 *
 * Часть позиций может не добавиться: товар сняли с продажи или удалили из
 * каталога. Это не повод отменять остальные — добавляем что можем и честно
 * говорим, чего не хватило.
 */
export function useRepeatOrder() {
  const t = useT();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (items: OrderLineItem[]) => {
      const additions = orderToCartAdditions(items);
      const failed: string[] = [];
      let added = 0;

      for (const addition of additions) {
        try {
          await addToCart({
            productId: addition.productId,
            qty: addition.qty,
            optionIds: addition.optionIds,
          });
          added += 1;
        } catch (err) {
          // Сеть отвалилась — дальше идти бессмысленно, остальные упадут так же.
          if (!isAppError(err)) throw err;
          failed.push(addition.name);
        }
      }

      return { added, failed };
    },
    onSuccess: async ({ added, failed }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });

      if (added === 0) {
        toast.error(
          failed.length > 0
            ? t("Ни одну позицию не удалось добавить: товаров больше нет в каталоге")
            : t("В заказе нет позиций для повтора"),
        );
        return;
      }

      const message = t("{count} в корзине", {
        count: plural(added, t("позиция"), t("позиции"), t("позиций")),
      });
      if (failed.length > 0) {
        toast.warning(
          t("{message}. Больше не в продаже: {names}", {
            message,
            names: failed.join(", "),
          }),
        );
      } else {
        toast.success(message);
      }

      await navigate({ to: "/cart" });
    },
    onError: (err) =>
      toast.error(isAppError(err) ? err.message : t("Не удалось повторить заказ")),
  });
}
