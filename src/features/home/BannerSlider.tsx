import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BannerOut } from "@/api/cms";
import { isSafeInternalPath } from "@/lib/redirect";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/LocaleProvider";

const FALLBACK_DURATION_MS = 7000;

type BannerSliderProps = {
  banners: BannerOut[];
};

export function BannerSlider({ banners }: BannerSliderProps) {
  const t = useT();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = banners.length;
  const current = banners[index] ?? banners[0];

  useEffect(() => {
    setIndex(0);
  }, [banners]);

  /*
   * Автопрокрутка отключается при prefers-reduced-motion: MASTER.md требует
   * уважать эту настройку, а движущийся баннер — ровно то, ради чего её
   * включают. Слушаем изменение, а не читаем один раз: настройку меняют
   * на лету, и в тестах эмулируют тоже.
   */
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || count <= 1) return;
    // Время показа настраивается в админке на слайд; 7000 — фолбэк для
    // баннеров без него (заведённых до этого поля) и для fallback-баннера.
    const durationMs = current?.duration_ms || FALLBACK_DURATION_MS;
    const timer = window.setTimeout(() => {
      go(index + 1);
    }, durationMs);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, index, paused, reducedMotion, current?.duration_ms]);

  if (!current) return null;

  function go(next: number) {
    if (count <= 0) return;
    setDirection(next >= index ? 1 : -1);
    setIndex(((next % count) + count) % count);
  }

  const href = current.link_url?.trim() || "/catalog";

  function onCta() {
    if (isSafeInternalPath(href)) {
      void navigate({ to: href });
      return;
    }
    // Внешняя ссылка баннера — её задаёт админ, но открываем в новой вкладке
    // и без доступа к window.opener.
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <section
      role="region"
      aria-roledescription={t("слайдер")}
      aria-label={t("Баннеры Medix")}
      className="relative aspect-[21/9] min-h-[280px] max-h-[520px] overflow-hidden rounded-3xl bg-[oklch(0.28_0.05_230)] text-white shadow-[0_22px_70px_-34px_rgba(11,68,99,0.55)]"
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
      {banners.map((banner, i) => {
        const isCurrent = i === index;
        // Неактивный слайд сдвинут в сторону, откуда листаем — при переходе
        // он въезжает/уезжает вместе с fade, а не просто подменяется.
        const inactiveOffsetPercent = direction * 8;
        return (
          <div
            key={banner.id}
            aria-hidden={!isCurrent}
            className={cn(
              "absolute inset-0",
              reducedMotion ? undefined : "transition-[transform,opacity] duration-700 ease-out",
              isCurrent ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            style={{
              transform: reducedMotion
                ? undefined
                : `translateX(${isCurrent ? 0 : inactiveOffsetPercent}%)`,
            }}
          >
            {banner.image_url ? (
              <img
                src={banner.image_url}
                alt=""
                width={1260}
                height={540}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover opacity-55"
              />
            ) : (
              <div className="absolute inset-0 h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(61,183,217,0.45),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(116,219,190,0.25),transparent_30%)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.22_0.05_230)] via-[oklch(0.22_0.05_230)/0.75] to-transparent" />

            <div className="relative z-10 flex h-full flex-col justify-center overflow-hidden px-6 py-8 sm:px-10 lg:px-14">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
                Medix International
              </p>
              <h1 className="mt-3 line-clamp-2 max-w-xl font-display text-3xl font-bold leading-tight sm:text-5xl">
                {banner.title || t("Медицинское оборудование для клиник")}
              </h1>
              {banner.subtitle ? (
                <p className="mt-4 line-clamp-3 max-w-lg text-sm text-white/80 sm:text-base">
                  {banner.subtitle}
                </p>
              ) : null}
              <div className="mt-8">
                <button
                  type="button"
                  onClick={onCta}
                  className="inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-[oklch(0.28_0.05_230)]"
                >
                  {banner.cta_text?.trim() || t("Смотреть каталог")}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {count > 1 ? (
        <>
          <button
            type="button"
            aria-label={t("Предыдущий слайд")}
            onClick={() => go(index - 1)}
            className="absolute top-1/2 left-3 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={t("Следующий слайд")}
            onClick={() => go(index + 1)}
            className="absolute top-1/2 right-3 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          {/*
           * Точка рисуется вложенным span, а нажимается кнопка вокруг неё:
           * сама точка 10px, попасть в неё пальцем нельзя. Кнопка 44px
           * по высоте и 32 по ширине — на всю ширину их разносить нельзя,
           * пять точек заняли бы 220px и разъехались по краям баннера.
           * Отступ снизу уменьшен на выросшую высоту, чтобы точки остались
           * на прежнем месте.
           */}
          <div className="absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={t("Слайд {n}", { n: i + 1 })}
                aria-current={i === index}
                onClick={() => go(i)}
                className="grid h-11 w-8 place-items-center"
              >
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full transition",
                    i === index ? "bg-white" : "bg-white/40 hover:bg-white/70",
                  )}
                />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
