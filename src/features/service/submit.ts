import type { CategoryOut } from "@/api/catalog";
import type { Translate } from "@/i18n/dictionaries";
import { contentText } from "@/i18n/content";
import { uploadMediaFile } from "@/api/media";
import {
  addServiceRequestPhoto,
  createServiceRequest,
  type CreateServiceRequestInput,
} from "@/api/service-requests";

export const MAX_SERVICE_PHOTOS = 5;
export const MAX_SERVICE_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * Тип оборудования в заявке на сервис — корневые категории каталога плюс
 * «Другое». Раньше здесь стоял захардкоженный список из четырёх строк,
 * никак не связанный с настоящими категориями каталога и никогда с ними
 * не сверявшийся.
 *
 * `value` уходит в бэкенд свободным текстом (CreateServiceRequestInput) и
 * должен оставаться на русском вне зависимости от языка интерфейса — это
 * данные заявки, а не подпись на кнопке (тот же контракт, что был у
 * старого списка). `label` — то, что видит человек, и оно локализовано:
 * для категорий это уже переведённое `name` из API, для «Другое» — `t()`.
 */
export function equipmentTypeOptionsFrom(
  categories: CategoryOut[],
  t: Translate = (s) => s,
): { value: string; label: string }[] {
  const roots = categories
    .filter((c) => c.is_active && !c.parent_id)
    .slice()
    .sort(
      (a, b) =>
        a.sort - b.sort ||
        contentText(a.name, a.name_ru).localeCompare(contentText(b.name, b.name_ru)),
    );

  return [
    ...roots.map((c) => ({
      value: c.name_ru || c.name,
      label: contentText(c.name, c.name_ru),
    })),
    { value: "Другое", label: t("Другое") },
  ];
}

export type PhotoDraft = {
  id: string;
  file: File;
  previewUrl: string;
};

export function createPhotoDraft(file: File): PhotoDraft {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export function revokePhotoDraft(photo: PhotoDraft) {
  URL.revokeObjectURL(photo.previewUrl);
}

export function validateServicePhoto(
  file: File,
  t: Translate = (s) => s,
): string | null {
  if (!file.type.startsWith("image/")) {
    return t("Можно загружать только изображения");
  }
  if (file.size > MAX_SERVICE_PHOTO_BYTES) {
    return t("Размер файла не больше 5 МБ");
  }
  return null;
}

/** Create request, then attach uploaded photo keys (max 5). */
export async function submitServiceRequestWithPhotos(
  input: CreateServiceRequestInput,
  photos: File[],
): Promise<{ id: string }> {
  const keys: string[] = [];
  for (const file of photos.slice(0, MAX_SERVICE_PHOTOS)) {
    keys.push(await uploadMediaFile("service-requests", file));
  }

  const created = await createServiceRequest(input);
  for (const key of keys) {
    await addServiceRequestPhoto(created.id, key);
  }
  return { id: created.id };
}

export function desiredDateToIso(dateValue: string): string | null {
  const trimmed = dateValue.trim();
  if (!trimmed) return null;
  // Local noon → stable ISO for backend datetime
  const d = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
