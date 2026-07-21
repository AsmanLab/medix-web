import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

type FormFieldProps = {
  label: string;
  className?: string;
  id?: string;
  children: ReactNode;
};

/** Accessible label wrapper — assigns `id` to the single child control. */
export function FormField({ label, className = "", id, children }: FormFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  const control = Children.only(children);
  const labelled =
    isValidElement(control) && control.type !== "string"
      ? cloneElement(control as ReactElement<{ id?: string }>, { id: fieldId })
      : control;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-xs font-semibold">
        {label}
      </label>
      {labelled}
    </div>
  );
}
