import { ExternalLink } from "lucide-react";
import type { ParsedVideo } from "@/features/catalog/video-url";

/**
 * Видеообзор товара.
 *
 * Плеер грузится лениво: ролик почти всегда лежит на третьей вкладке, и
 * тянуть ради него скрипты площадки при открытии карточки незачем.
 *
 * Ссылка «смотреть на площадке» рядом обязательна: во встроенном плеере
 * нет ни описания, ни канала производителя, а именно за ними и уходят
 * с карточки товара.
 */
export function ProductVideo({
  video,
  title,
}: {
  video: ParsedVideo;
  title: string;
}) {
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-border bg-foreground/5">
        <iframe
          src={video.embedUrl}
          title={`Видео: ${title}`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="aspect-video w-full border-0"
        />
      </div>

      <a
        href={video.watchUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary"
      >
        Смотреть на {video.providerLabel}
        <ExternalLink className="h-4 w-4" aria-hidden />
      </a>
    </div>
  );
}
