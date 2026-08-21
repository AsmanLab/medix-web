import { apiRequest } from "@/api/client";
import { toAppError } from "@/api/errors";
import { translate } from "@/i18n/dictionaries";
import { getLocale } from "@/i18n/locale-store";

/** Вне React, как и api/errors.ts — язык читается из общего хранилища. */
function t(source: string): string {
  return translate(getLocale(), source);
}

type MediaDownloadResponse = {
  key: string;
  download_url: string;
  expires_in: number;
};

type MediaUploadResponse = {
  key: string;
  upload_url: string;
  expires_in: number;
};

export type MediaUploadPurpose =
  | "products"
  | "documents"
  | "service-requests"
  | "cms";

/**
 * Public download URL for S3 key (cms/, products/, documents/).
 *
 * Returns null both when there is no key and when resolution failed, because
 * callers render a placeholder either way. The failure is logged instead of
 * swallowed: a silently-null 403 is what hid the uploaded-media bug from UAT
 * (a broken image is indistinguishable from "no image was set").
 */
export async function fetchMediaDownloadUrl(
  key: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const trimmed = key.trim();
  if (!trimmed) return null;

  try {
    const res = await apiRequest<MediaDownloadResponse>({
      path: `/media/${trimmed}/download`,
      signal,
      retryOnUnauthorized: false,
    });
    return res.download_url || null;
  } catch (error) {
    if (signal?.aborted) return null;
    const appError = toAppError(error, "Не удалось получить ссылку на файл");
    console.warn(
      `[media] ${appError.status ?? "?"} resolving "${trimmed}": ${appError.message}`,
    );
    return null;
  }
}

export function requestMediaUpload(input: {
  purpose: MediaUploadPurpose;
  filename: string;
  contentType: string;
}) {
  return apiRequest<MediaUploadResponse>({
    method: "POST",
    path: "/media/upload",
    body: {
      purpose: input.purpose,
      filename: input.filename,
      content_type: input.contentType,
    },
  });
}

/** PUT file to a presigned S3 URL (no API auth header). */
export async function uploadFileToPresignedUrl(
  uploadUrl: string,
  file: Blob,
  contentType: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
  } catch (error) {
    throw toAppError(error, t("Не удалось загрузить файл"));
  }
  if (!response.ok) {
    throw toAppError(
      new Error(`Upload failed: ${response.status}`),
      t("Не удалось загрузить файл в хранилище"),
    );
  }
}

/** Request presign, PUT bytes, return object key. */
export async function uploadMediaFile(
  purpose: MediaUploadPurpose,
  file: File,
): Promise<string> {
  const contentType = file.type || "application/octet-stream";
  const { key, upload_url } = await requestMediaUpload({
    purpose,
    filename: file.name || "file",
    contentType,
  });
  await uploadFileToPresignedUrl(upload_url, file, contentType);
  return key;
}
