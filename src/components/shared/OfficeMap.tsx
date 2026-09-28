import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MapPin } from "lucide-react";
import { useT } from "@/i18n/LocaleProvider";

type OfficeMapProps = {
  officeName: string;
  address: string;
  /** Ручная ссылка на встраиваемую карту из CMS — имеет приоритет над геокодированием. */
  explicitEmbedUrl?: string | null;
};

type GeoPoint = { lat: number; lon: number };

/**
 * Google Maps embed (output=embed) без API-ключа у Google периодически
 * отдаёт пустой iframe — картой пользоваться невозможно. OpenStreetMap
 * встраивается без ключа и без такого отказа, но принимает только
 * координаты, поэтому адрес сперва геокодируется через Nominatim.
 */
function useGeocode(address: string) {
  return useQuery({
    queryKey: ["osm-geocode", address],
    queryFn: async ({ signal }): Promise<GeoPoint | null> => {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`,
        { signal },
      );
      if (!res.ok) throw new Error("geocode request failed");
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      const hit = data[0];
      if (!hit) return null;
      return { lat: Number(hit.lat), lon: Number(hit.lon) };
    },
    enabled: !!address,
    staleTime: 24 * 60 * 60_000,
    retry: 1,
  });
}

export function OfficeMap({ officeName, address, explicitEmbedUrl }: OfficeMapProps) {
  const t = useT();
  const trimmedOverride = explicitEmbedUrl?.trim();
  const geo = useGeocode(trimmedOverride ? "" : address);
  const point = geo.data;

  let embedSrc: string | null = null;
  let mapHref: string | null = null;

  if (trimmedOverride) {
    embedSrc = trimmedOverride;
    mapHref = trimmedOverride;
  } else if (point) {
    const delta = 0.006;
    const bbox = [
      point.lon - delta,
      point.lat - delta,
      point.lon + delta,
      point.lat + delta,
    ].join(",");
    embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${point.lat},${point.lon}`;
    mapHref = `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=17/${point.lat}/${point.lon}`;
  } else if (address) {
    mapHref = `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;
  }

  return (
    <div className="flex h-full flex-col">
      {embedSrc ? (
        <div className="min-h-[240px] w-full flex-1">
          <iframe
            title={t("Карта — {name}", { name: officeName })}
            src={embedSrc}
            className="h-full min-h-[240px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : (
        <div className="grid min-h-[160px] flex-1 place-items-center gap-2 bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
          <MapPin className="mx-auto h-6 w-6" />
          {geo.isLoading
            ? t("Определяем точку на карте…")
            : t("Не удалось определить точку на карте")}
        </div>
      )}

      {mapHref ? (
        <a
          href={mapHref}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 border-t border-border bg-card px-4 py-3 text-sm font-semibold text-primary"
        >
          {t("Открыть в OpenStreetMap")} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </div>
  );
}
