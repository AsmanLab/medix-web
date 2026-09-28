import { useEffect } from "react";
import { X } from "lucide-react";
import { useT } from "@/i18n/LocaleProvider";

type ImageLightboxProps = {
  src: string;
  alt: string;
  onClose: () => void;
};

/**
 * Просмотр фото поверх страницы — без открытия оригинала в новой вкладке
 * в полном разрешении: там нет ни рамки, ни возможности закрыть иначе,
 * чем кнопкой "назад", и фото выглядит непонятно большим.
 */
export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const t = useT();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/80 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label={t("Закрыть")}
        onClick={onClose}
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-background/90 text-foreground shadow-sm transition hover:bg-background"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[85vh] max-w-[90vw] rounded-2xl bg-white object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
