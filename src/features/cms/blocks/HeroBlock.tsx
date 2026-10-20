import { Clock3, Phone, ShieldCheck } from "lucide-react";
import type { Block } from "./schema";

export type HeroBlockData = Extract<Block, { type: "hero" }>;

const FACT_ICONS = {
  none: null,
  clock: Clock3,
  phone: Phone,
  shield: ShieldCheck,
} as const;

type HeroBlockProps = {
  block: HeroBlockData;
  /**
   * На `/pages/$slug` и `/about` заголовок страницы уже рисует хост-страница
   * (`<h1>{page.title}</h1>`) — там баннер идёт вторым заголовком ("h2").
   * На `/service`, где баннер — первое, что видит посетитель, это сам `<h1>`.
   */
  titleAs?: "h1" | "h2";
};

/**
 * Тёмный баннер страницы. Вёрстка перенесена из `routes/service/index.tsx`
 * один-в-один, чтобы правка в CMS не меняла внешний вид — `PageBlocks`
 * (витрина) и `CmsPageEditor` (превью в админке) рисуют один и тот же
 * компонент.
 */
export function HeroBlock({ block, titleAs = "h2" }: HeroBlockProps) {
  const Title = titleAs;
  return (
    <div className="relative w-full overflow-hidden rounded-[28px] bg-[oklch(.24_.06_238)] px-6 py-10 text-white sm:rounded-[36px] sm:px-10 sm:py-14">
      <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
      <div className="relative z-10 max-w-2xl">
        {block.badge ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]">
            {block.badge}
          </span>
        ) : null}
        <Title className="mt-5 font-display text-[34px] font-bold leading-tight tracking-tight sm:text-5xl">
          {block.title}
        </Title>
        {block.subtitle ? (
          <p className="mt-5 max-w-xl text-sm leading-6 text-white/65 sm:text-base sm:leading-7">
            {block.subtitle}
          </p>
        ) : null}
        {block.facts.length > 0 ? (
          <div className="mt-7 flex flex-wrap gap-5 text-xs text-white/75 sm:text-sm">
            {block.facts.map((fact, i) => {
              const Icon = FACT_ICONS[fact.icon];
              return (
                <span key={i} className="inline-flex items-center gap-2">
                  {Icon ? <Icon className="h-4 w-4 text-[oklch(.78_.11_209)]" aria-hidden /> : null}
                  {fact.text}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
