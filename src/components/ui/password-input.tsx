import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { useT } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  /** Классы внешнего контейнера — отступы вешать сюда, а не на поле. */
  wrapperClassName?: string;
};

/**
 * Поле пароля с переключателем «показать/скрыть».
 *
 * Переключатель был только на входе, а остальные шесть полей пароля его
 * не имели. Хуже всего это на регистрации и сбросе: там вводят новый
 * пароль вслепую, причём дважды, и опечатку видно только по отказу формы.
 *
 * Кнопка лежит поверх правого края поля, поэтому у поля добавлен отступ
 * `pe-11` — ровно под её ширину, иначе длинный пароль уезжал бы под иконку.
 *
 * Поле входа (`routes/login.tsx`) сюда не переведено намеренно: там своя
 * рамка с иконкой замка внутри, и подмена разметки изменила бы вид формы
 * без причины. Если это поле когда-нибудь приведут к общему виду — забрать
 * его сюда, чтобы реализация осталась одна.
 */
export function PasswordInput({
  className,
  wrapperClassName,
  ...props
}: PasswordInputProps) {
  const t = useT();
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("relative", wrapperClassName)}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(className ?? "field-control", "pe-11")}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // aria-pressed сообщает состояние тем, кто не видит иконку:
        // подпись меняется вместе с ним, поэтому дублирования нет.
        aria-pressed={visible}
        aria-label={visible ? t("Скрыть пароль") : t("Показать пароль")}
        className="absolute inset-y-0 end-0 grid w-11 place-items-center rounded-e-xl text-muted-foreground active:bg-secondary"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden />
        ) : (
          <Eye className="h-4 w-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
