import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BannerOut } from "@/api/cms";
import { cn } from "@/lib/utils";

type BannerSliderProps = {
  banners: BannerOut[];
  imageById: Record<string, string | null>;
};

function isInternalPath(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

export function BannerSlider({ banners, imageById }: BannerSliderProps) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = banners.length;
  const current = banners[index] ?? banners[0];

  useEffect(() => {
    setIndex(0);
  }, [banners]);

  useEffect(() => {
    if (paused || count <= 1) return;
    const timer = window.setTimeout(() => {
      setIndex((i) => (i + 1) % count);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [count, index, paused]);

  if (!current) return null;

  function go(next: number) {
    if (count <= 0) return;
    setIndex(((next % count) + count) % count);
  }

  const imageUrl = imageById[current.id];
  const cta = current.cta_text?.trim() || "Смотреть каталог";
  const href = current.link_url?.trim() || "/catalog";

  function onCta() {
    if (isInternalPath(href)) {
      void navigate({ to: href });
      return;
    }
    window.location.assign(href);
  }

  return (
    <section
      role="region"
      aria-roledescription="слайдер"
      aria-label="Баннеры Medix"
      className="relative overflow-hidden rounded-3xl bg-[oklch(0.28_0.05_230)] text-white shadow-[0_22px_70px_-34px_rgba(11,68,99,0.55)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        const end = e.changedTouches[0]?.clientX;
        touchStartX.current = null;
        setPaused(false);
        if (start == null || end == null) return;
        const delta = end - start;
        if (Math.abs(delta) < 40) return;
        go(delta < 0 ? index + 1 : index - 1);
      }}
    >
      <div className="absolute inset-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover opacity-55"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(61,183,217,0.45),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(116,219,190,0.25),transparent_30%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.22_0.05_230)] via-[oklch(0.22_0.05_230)/0.75] to-transparent" />
      </div>

      <div className="relative z-10 flex min-h-[360px] flex-col justify-center px-6 py-12 sm:min-h-[420px] sm:px-10 lg:px-14">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
          Medix International
        </p>
        <h1 className="mt-3 max-w-xl font-display text-3xl font-bold leading-tight sm:text-5xl">
          {current.title || "Медицинское оборудование для клиник"}
        </h1>
        {current.subtitle ? (
          <p className="mt-4 max-w-lg text-sm text-white/80 sm:text-base">
            {current.subtitle}
          </p>
        ) : null}
        <div className="mt-8">
          <button
            type="button"
            onClick={onCta}
            className="inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-[oklch(0.28_0.05_230)]"
          >
            {cta}
          </button>
        </div>
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            aria-label="Предыдущий слайд"
            onClick={() => go(index - 1)}
            className="absolute top-1/2 left-3 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Следующий слайд"
            onClick={() => go(index + 1)}
            className="absolute top-1/2 right-3 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`Слайд ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition",
                  i === index ? "bg-white" : "bg-white/40 hover:bg-white/70",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
