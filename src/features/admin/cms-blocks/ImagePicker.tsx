import { useQuery } from "@tanstack/react-query";
import { Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { isAppError } from "@/api/errors";
import { fetchMediaDownloadUrl, uploadMediaFile } from "@/api/media";
import { cn } from "@/lib/utils";

type ImagePickerProps = {
  imageKey: string;
  onChange: (key: string) => void;
  className?: string;
};

/**
 * Загрузка + превью одной картинки. Общий контрол для блоков «Фото»,
 * «Галерея» и «Текст рядом с фото» — та же связка `uploadMediaFile("cms")` +
 * `fetchMediaDownloadUrl`, что у баннеров (routes/admin/banners/index.tsx),
 * включая контейнер фиксированной высоты — без него превью прыгает при
 * подгрузке.
 */
export function ImagePicker({ imageKey, onChange, className }: ImagePickerProps) {
  const [uploading, setUploading] = useState(false);

  const previewQuery = useQuery({
    queryKey: ["media", "preview", imageKey],
    queryFn: ({ signal }) => fetchMediaDownloadUrl(imageKey, signal),
    enabled: Boolean(imageKey.trim()),
  });

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const key = await uploadMediaFile("cms", file);
      onChange(key);
    } catch (err) {
      toast.error(isAppError(err) ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="h-32 overflow-hidden rounded-xl border border-border bg-muted">
        {imageKey.trim() ? (
          previewQuery.data ? (
            <img src={previewQuery.data} alt="" className="h-32 w-full object-cover" />
          ) : (
            <div className="grid h-32 place-items-center text-xs text-muted-foreground">
              {previewQuery.isLoading ? "Загрузка…" : "Нет превью"}
            </div>
          )
        ) : (
          <div className="grid h-32 place-items-center text-xs text-muted-foreground">
            Фото не выбрано
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary">
          <Upload className="h-3.5 w-3.5" aria-hidden />
          {uploading ? "Загрузка…" : imageKey.trim() ? "Заменить фото" : "Загрузить фото"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
          />
        </label>
        {imageKey.trim() ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Убрать
          </button>
        ) : null}
      </div>
    </div>
  );
}
