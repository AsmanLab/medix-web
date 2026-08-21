import type { Translate } from "@/i18n/dictionaries";
import { uploadMediaFile } from "@/api/media";
import {
  addServiceRequestPhoto,
  createServiceRequest,
  type CreateServiceRequestInput,
} from "@/api/service-requests";

export const MAX_SERVICE_PHOTOS = 5;
export const MAX_SERVICE_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * Тип оборудования в заявке на сервис.
 *
 * `value` уходит в бэкенд свободным текстом (CreateServiceRequestInput)
 * и должен оставаться на русском вне зависимости от языка интерфейса:
 * это данные заявки, а не подпись на кнопке. `label` — то, что видит
 * человек, и оно уже переводимо.
 */
export function equipmentTypeOptions(
  t: Translate = (s) => s,
): { value: string; label: string }[] {
  return [
    { value: "Диагностическое оборудование", label: t("Диагностическое оборудование") },
    { value: "Лабораторное оборудование", label: t("Лабораторное оборудование") },
    { value: "Хирургическое оборудование", label: t("Хирургическое оборудование") },
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
