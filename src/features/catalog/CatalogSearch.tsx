import { Search, X } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Поле поиска по товарам — одно на каталог и на страницу раздела.
 *
 * Было две копии формы, отличавшиеся только идентификатором поля,
 * подписью и раскладкой обёртки.
 *
 * ### Почему крестик
 *
 * Поиск применяется по кнопке, а результат живёт в адресной строке. Из-за
 * этого снять его было нечем: очистить поле руками недостаточно — выдача
 * остаётся отфильтрованной, пока не нажмёшь «Найти» с пустым полем. То есть
 * поле и результат расходились, и человек видел «товары не найдены» при
 * пустой на вид форме.
 *
 * Крестик снимает и то, и другое сразу. Он показывается и тогда, когда поле
 * уже пустое, но выдача всё ещё отфильтрована прошлым запросом — иначе
 * из этого состояния нет выхода, кроме как догадаться нажать «Найти».
 *
 * Escape делает то же самое: для поля с `role="search"` это привычное
 * поведение, и на клавиатуре так быстрее, чем целиться в кнопку.
 */

type CatalogSearchProps = {
  /** Нужен подписи: полей поиска на странице раздела может быть не одно. */
  id: string;
  /** Подпись для скринридера и заголовок формы. */
  label: string;
  placeholder: string;
  /** Текст в поле. */
  value: string;
  /**
   * Запрос, по которому сейчас показана выдача. Отличается от `value`, пока
   * человек печатает и ещё не нажал «Найти», — и именно из-за этого разрыва
   * крестик не может зависеть только от `value`.
   */
  appliedValue?: string;
  onChange: (value: string) => void;
  /** Снять поиск: очистить поле и вернуть выдачу без фильтра. */
  onClear: () => void;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
};

export function CatalogSearch({
  id,
  label,
  placeholder,
  value,
  appliedValue = "",
  onChange,
  onClear,
  onSubmit,
  className,
}: CatalogSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canClear = value.length > 0 || appliedValue.length > 0;

  function clear() {
    onClear();
    // Фокус обратно в поле: после нажатия крестика он остался бы на кнопке,
    // которая тут же исчезает, и Tab пошёл бы с начала страницы.
    inputRef.current?.focus();
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label={label}
      className={cn("flex gap-2", className)}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={inputRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && canClear) {
              // Иначе Escape в поле внутри шторки закрыл бы саму шторку.
              e.stopPropagation();
              clear();
            }
          }}
          placeholder={placeholder}
          // pe-11 — место под крестик: без него текст уезжает под кнопку.
          className={cn("field-control pl-10", canClear && "pe-11")}
        />
        {canClear ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Очистить поиск"
            // Кнопка во всю высоту поля: 44px по WCAG 2.5.5 при том, что
            // сама иконка 16px.
            className="absolute inset-y-0 right-0 grid w-11 touch-manipulation place-items-center rounded-e-[0.875rem] text-muted-foreground hover:text-foreground active:bg-secondary"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <button
        type="submit"
        className="h-11 shrink-0 touch-manipulation rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground active:bg-primary/90"
      >
        Найти
      </button>
    </form>
  );
}
