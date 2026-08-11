import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { queryKeys } from "@/api/query-keys";
import { openDeepLink } from "@/features/notifications/open-deep-link";
import { playNotificationSound } from "@/lib/notification-sound";
import type { ForegroundPush } from "@/lib/push";
import { useSession } from "@/session/store";

/**
 * Показывает системное уведомление, когда вкладка открыта, но не видна.
 *
 * Сообщение отдаётся странице, если у сайта есть открытая вкладка, — а на
 * телефоне «открытая вкладка» и «человек смотрит на неё» это разные вещи:
 * достаточно свернуть браузер или погасить экран. Плашка в такой момент
 * никому не покажется, поэтому рисуем настоящее уведомление сами.
 */
async function showSystemNotification(message: ForegroundPush) {
  try {
    if (Notification.permission !== "granted") return;
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) return;
    await registration.showNotification(message.title, {
      body: message.body,
      icon: "/favicon.svg",
      tag: "medix-notification",
      // Ключ deepLink — его же читает обработчик клика в service worker'е.
      data: { deepLink: message.deepLink },
    });
  } catch {
    // Не показалось — уведомление всё равно лежит в центре уведомлений.
  }
}

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

            if (document.visibilityState !== "visible") {
              void showSystemNotification(message);
              return;
            }

            playNotificationSound();
            toast.message(message.title, {
              description: message.body,
              duration: 8000,
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
