import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ProductImageOut } from "@/api/generated/schemas";
import { cn } from "@/lib/utils";

type ProductGalleryProps = {
  images: ProductImageOut[];
  alt: string;
};

/**
 * Галерея карточки товара.
 *
 * Карточка показывала только главное изображение, а остальные загруженные
 * фотографии не было видно вовсе — они просто лежали в базе.
 *
 * Главная идёт первой, дальше — по полю sort: порядок в админке должен
 * совпадать с порядком на витрине.
 */
export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const ordered = useMemo(
    () =>
      [...images].sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        return a.sort - b.sort;
      }),
    [images],
  );

  const [index, setIndex] = useState(0);

  // Смена товара не должна оставлять индекс от предыдущей карточки.
  useEffect(() => {
    setIndex(0);
  }, [ordered.map((i) => i.id).join(",")]);

  if (ordered.length === 0) {
    return (
      <div className="grid aspect-[16/9] place-items-center gap-2 bg-primary-soft text-sm text-muted-foreground">
        <ImageOff className="h-8 w-8" aria-hidden />
        Нет изображения
      </div>
    );
  }

  const current = ordered[Math.min(index, ordered.length - 1)];
  const many = ordered.length > 1;

  function step(delta: number) {
    setIndex((prev) => (prev + delta + ordered.length) % ordered.length);
  }

  return (
    <div>
      <div
        className="group relative"
        role={many ? "group" : undefined}
        aria-label={many ? `Фотографии товара: ${ordered.length}` : undefined}
        onKeyDown={(e) => {
          if (!many) return;
          if (e.key === "ArrowLeft") step(-1);
          if (e.key === "ArrowRight") step(1);
        }}
        tabIndex={many ? 0 : undefined}
      >
        {current.url ? (
          <img
            src={current.url}
            alt={alt}
            fetchPriority={index === 0 ? "high" : "auto"}
            decoding="async"
            className="aspect-[16/9] w-full bg-white object-contain"
          />
        ) : (
          <div className="grid aspect-[16/9] place-items-center bg-primary-soft text-sm text-muted-foreground">
            Изображение недоступно
          </div>
        )}

        {many ? (
          <>
            <button
              type="button"
              aria-label="Предыдущее фото"
              onClick={() => step(-1)}
              className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition hover:bg-background"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Следующее фото"
              onClick={() => step(1)}
              className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition hover:bg-background"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <span
              aria-live="polite"
              className="absolute bottom-3 right-3 rounded-full bg-foreground/70 px-2.5 py-1 text-xs font-semibold text-background"
            >
              {index + 1} / {ordered.length}
            </span>
          </>
        ) : null}
      </div>

      {many ? (
        <ul className="flex gap-2 overflow-x-auto p-3">
          {ordered.map((image, i) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                aria-label={`Фото ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  "overflow-hidden rounded-xl border-2 transition",
                  i === index
                    ? "border-primary"
                    : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                {image.url ? (
                  <img
                    src={image.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-16 w-20 bg-white object-contain"
                  />
                ) : (
                  <span className="grid h-16 w-20 place-items-center bg-muted text-[10px] text-muted-foreground">
                    нет
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
