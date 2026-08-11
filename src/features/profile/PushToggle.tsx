import { BellOff, BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isAppError } from "@/api/errors";
import { sendTestPush } from "@/api/notifications";
import { Button } from "@/components/ui/button";
import { describePushSelfTest } from "@/features/profile/push-self-test";
import {
  disablePush,
  enablePush,
  pushSupport,
  type PushSupport,
} from "@/lib/push";

/**
 * Включение push-уведомлений в браузере.
 *
 * Блок не показывается вовсе, если Firebase не настроен или браузер не умеет
 * push: кнопка, которая заведомо ничего не сделает, хуже её отсутствия.
 */
export function PushToggle() {
  const [state, setState] = useState<PushSupport | null>(null);
  const [busy, setBusy] = useState(false);

  // Состояние читается после монтирования: pushSupport трогает Notification
  // и localStorage, которых нет при серверном рендере и в тестовой среде.
  useEffect(() => setState(pushSupport()), []);

  if (state === null || state === "not-configured" || state === "unsupported") {
    return null;
  }

  async function onEnable() {
    setBusy(true);
    try {
      const result = await enablePush();
      if (result.ok) {
        setState("enabled");
        toast.success("Уведомления включены");
      } else {
        setState(pushSupport());
        toast.error(result.reason);
      }
    } catch {
      toast.error("Не удалось включить уведомления");
    } finally {
      setBusy(false);
    }
  }

  async function onDisable() {
    setBusy(true);
    try {
      await disablePush();
      setState("ready");
      toast.success("Уведомления выключены");
    } finally {
      setBusy(false);
    }
  }

  // «Включено», но ничего не приходит — состояние, в котором пользователю
  // нечего проверить самому: отправка происходит на сервере и молчит при
  // любой причине. Кнопка спрашивает у сервера, что именно не так.
  async function onTest() {
    setBusy(true);
    try {
      const verdict = describePushSelfTest(await sendTestPush());
      toast[verdict.tone](verdict.text);
    } catch (err) {
      toast.error(
        isAppError(err) ? err.message : "Не удалось проверить уведомления",
      );
    } finally {
      setBusy(false);
    }
  }

  const enabled = state === "enabled";
  const blocked = state === "denied";

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          {enabled ? (
            <BellRing className="h-4 w-4" aria-hidden />
          ) : (
            <BellOff className="h-4 w-4" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Уведомления в браузере</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {blocked
              ? "Уведомления запрещены в настройках браузера для этого сайта. Разрешите их в настройках сайта, затем вернитесь сюда."
              : enabled
                ? "Сообщим о котировке, смене статуса заказа и ответе по сервисной заявке, даже если вкладка закрыта."
                : "Сообщим о котировке, смене статуса заказа и ответе по сервисной заявке. Браузер спросит разрешение."}
          </p>

          {!blocked ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant={enabled ? "outline" : "primary"}
                size="sm"
                disabled={busy}
                onClick={() => void (enabled ? onDisable() : onEnable())}
              >
                {busy ? "Секунду…" : enabled ? "Выключить" : "Включить"}
              </Button>
              {enabled ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void onTest()}
                >
                  Проверить
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
