import { AlertTriangle, Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type TempPasswordDialogProps = {
  phone: string;
  fullName: string;
  password: string;
  onClose: () => void;
};

/**
 * Временный пароль нового клиента — сервер отдаёт его ровно один раз в
 * ответе на создание, дальше он нигде не хранится в открытом виде.
 * Менеджер должен успеть продиктовать его в трубку или скопировать здесь.
 */
export function TempPasswordDialog({
  phone,
  fullName,
  password,
  onClose,
}: TempPasswordDialogProps) {
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, []);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success("Пароль скопирован");
    } catch {
      toast.error("Не удалось скопировать — выделите пароль вручную");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="temp-password-title"
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] outline-none"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning-strong">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="temp-password-title" className="font-display text-xl font-bold">
              Клиент создан
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {fullName || "Без имени"} · {phone}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Временный пароль
          </p>
          <p className="mt-1.5 break-all font-mono text-2xl font-bold">
            {password}
          </p>
        </div>

        <p className="mt-3 text-xs leading-5 text-warning-strong">
          Пароль показывается только один раз и нигде больше не сохраняется —
          продиктуйте его клиенту сейчас или скопируйте.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={() => void onCopy()}>
            {copied ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : (
              <Copy className="h-4 w-4" aria-hidden />
            )}
            Копировать
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Готово
          </Button>
        </div>
      </div>
    </div>
  );
}
