import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { queryKeys } from "@/api/query-keys";
import { openDeepLink } from "@/features/notifications/open-deep-link";
import { useSession } from "@/session/store";

/**
 * Показывает уведомления, пришедшие при открытой вкладке.
 *
 * Системное уведомление в этот момент браузер не рисует: пока страница на
 * переднем плане, FCM отдаёт сообщение ей, а не service worker'у. Для
 * пользователя это выглядело так, будто push приходят, только когда браузер
 * свёрнут, — самое частое недоумение при первой проверке.
 *
 * Заодно обновляет счётчик непрочитанных: без этого колокольчик оживал
 * в течение минуты, до следующего опроса.
 */
export function PushForegroundBridge() {
  const { status } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status !== "authenticated") return;

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const stop = await import("@/lib/push").then((m) =>
          m.onForegroundPush((message) => {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.notifications.all,
            });
            toast.message(message.title, {
              description: message.body,
              action: message.deepLink
                ? {
                    label: "Открыть",
                    onClick: () => void openDeepLink(navigate, message.deepLink),
                  }
                : undefined,
            });
          }),
        );
        // Размонтировались, пока грузился SDK, — сразу отписываемся.
        if (cancelled) stop();
        else unsubscribe = stop;
      } catch {
        // Push не настроен или браузер не умеет — штатное состояние.
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [status, navigate, queryClient]);

  return null;
}
