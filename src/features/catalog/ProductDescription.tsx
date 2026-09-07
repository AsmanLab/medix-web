import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  parseDescription,
  type DescriptionBlock,
} from "@/features/catalog/product-description";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/LocaleProvider";

// Число блоков — плохая мера длины: одна строка характеристики и таблица
// на 20 строк раньше весили одинаково (по одному блоку каждая), потому что
// пустые строки дробили таблицы на однострочные блоки. Теперь блоки не
// дробятся, так что считаем "вес" — строки таблицы и пункты списка, а не
// сами блоки.
const COLLAPSED_ROWS = 12;

function blockWeight(block: DescriptionBlock): number {
  switch (block.kind) {
    case "specs":
      return block.rows.length;
    case "list":
      return block.items.length;
    default:
      return 1;
  }
}

/**
 * Описание товара с разметкой вместо сплошного текста.
 *
 * Описания приходят одним полем, но внутри у них абзацы, характеристики
 * «Ключ: значение» и списки. Раньше всё это выводилось единственным <p>,
 * и спецификация на три тысячи знаков читалась как стена текста.
 *
 * Длинные описания сворачиваются: под характеристиками должны оставаться
 * видимыми кнопка покупки и конфигуратор, а не бесконечная простыня.
 *
 * Внутри вкладки «Технические характеристики» сворачивание и собственный
 * заголовок не нужны: текст и так убран под ярлык, а второй заголовок над
 * ним читался бы как вложенный раздел — отсюда `bare`.
 */
export function ProductDescription({
  text,
  bare = false,
}: {
  text: string;
  bare?: boolean;
}) {
  const t = useT();
  const blocks = useMemo(() => parseDescription(text), [text]);
  const [expanded, setExpanded] = useState(false);

  if (blocks.length === 0) return null;

  // Блок никогда не режется пополам: как только накопленный вес достиг
  // порога, следующий блок целиком уходит в "показать полностью".
  const collapsedBlocks = useMemo(() => {
    let weight = 0;
    const out: DescriptionBlock[] = [];
    for (const block of blocks) {
      if (out.length > 0 && weight >= COLLAPSED_ROWS) break;
      out.push(block);
      weight += blockWeight(block);
    }
    return out;
  }, [blocks]);

  const collapsible = !bare && collapsedBlocks.length < blocks.length;
  const visible = expanded || !collapsible ? blocks : collapsedBlocks;

  const Wrapper = bare ? "div" : "section";

  return (
    <Wrapper className={bare ? undefined : "rounded-3xl border border-border bg-card p-5"}>
      {bare ? null : <h2 className="font-semibold">{t("Описание")}</h2>}

      <div className={cn("space-y-4", !bare && "mt-3")}>
        {visible.map((block, i) => {
          switch (block.kind) {
            case "heading":
              return (
                <h3
                  key={i}
                  className="pt-1 text-sm font-bold uppercase tracking-wide text-foreground"
                >
                  {block.text}
                </h3>
              );

            case "list":
              return (
                <ul key={i} className="space-y-1.5">
                  {block.items.map((item, j) => (
                    <li
                      key={j}
                      className="flex gap-2 text-sm leading-6 text-muted-foreground"
                    >
                      <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              );

            case "specs":
              return (
                <dl
                  key={i}
                  className="divide-y divide-border overflow-hidden rounded-2xl border border-border"
                >
                  {block.rows.map((row, j) => (
                    <div
                      key={j}
                      className="grid gap-1 px-3 py-2.5 sm:grid-cols-[minmax(0,13rem)_1fr] sm:gap-4"
                    >
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {row.label}
                      </dt>
                      <dd className="text-sm leading-6">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              );

            default:
              return (
                <p key={i} className="text-sm leading-6 text-muted-foreground">
                  {block.text}
                </p>
              );
          }
        })}
      </div>

      {collapsible ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t("Свернуть") : t("Показать полностью")}
        </Button>
      ) : null}
    </Wrapper>
  );
}
