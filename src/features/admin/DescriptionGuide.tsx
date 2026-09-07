import { useMemo } from "react";
import { ProductDescription } from "@/features/catalog/ProductDescription";
import { parseDescription } from "@/features/catalog/product-description";

/**
 * Описание товара в админке — одно текстовое поле, а на карточке из него
 * получаются характеристики, списки и подзаголовки: витрина разбирает текст
 * по правилам `product-description.ts`. Решение по строке принимается не по
 * ней одной, а по соседям (в том числе через пустую строку) — характеристика
 * рядом с другой характеристикой распознаётся независимо от длины значения;
 * лимит действует только для одинокой строки.
 *
 * Предпросмотр рисуется тем же компонентом, что и карточка товара, — иначе
 * подсказка со временем разойдётся с тем, что видит клиент.
 */

export const DESCRIPTION_PLACEHOLDER = `Автоматический биохимический анализатор для клинико-диагностических лабораторий среднего объёма.

Технические характеристики:
Производитель: Mindray
Производительность: 120 тестов в час

Методы измерения: конечная точка, кинетика, двухточечный метод, турбидиметрия, многоточечная калибровка, бланк по реагенту и бланк по образцу, мультистандартный режим, двуволновые измерения

Вес: 45 кг

• Открытая система реагентов
• Штатив на 40 позиций`;

const RULES: { syntax: string; result: string }[] = [
  { syntax: "Название: значение", result: "строка таблицы характеристик" },
  {
    syntax: "Название: длинное значение",
    result:
      "тоже строка таблицы, если рядом есть другие такие строки; одинокая длинная строка останется абзацем",
  },
  {
    syntax: "Заголовок раздела:",
    result: "подзаголовок — если следом идут характеристики или список",
  },
  { syntax: "Короткая строка без двоеточия", result: "подзаголовок раздела" },
  { syntax: "• пункт", result: "маркированный список" },
  { syntax: "пустая строка", result: "разделяет абзацы; таблицу и список не разрывает" },
  { syntax: "остальной текст", result: "обычный абзац" },
];

export function DescriptionFormatHint() {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-3">
      <p className="text-xs font-semibold">Как размечается описание</p>
      <dl className="mt-2 space-y-1">
        {RULES.map((rule) => (
          <div
            key={rule.syntax}
            className="grid gap-1 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-3"
          >
            <dt className="font-mono text-[11px] leading-5 text-foreground">
              {rule.syntax}
            </dt>
            <dd className="text-[11px] leading-5 text-muted-foreground">
              → {rule.result}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
        Название слева от двоеточия — до 64 знаков и не длиннее шести слов;
        иначе строка останется абзацем.
      </p>
    </div>
  );
}

export function DescriptionPreview({ text }: { text: string }) {
  const specCount = useMemo(
    () =>
      parseDescription(text)
        .filter((b) => b.kind === "specs")
        .reduce((sum, b) => sum + b.rows.length, 0),
    [text],
  );

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold">Как увидит клиент</p>
        <p className="text-[11px] text-muted-foreground">
          {specCount > 0
            ? `характеристик распознано: ${specCount}`
            : "характеристики не распознаны"}
        </p>
      </div>
      <div className="mt-2">
        {text.trim() ? (
          <ProductDescription text={text} />
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            Описание пустое — на карточке товара блока не будет.
          </p>
        )}
      </div>
    </section>
  );
}
