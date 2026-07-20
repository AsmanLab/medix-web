import { apiRequest } from "@/api/client";
import { toAppError } from "@/api/errors";

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

/** Public download URL for S3 key (cms/, products/, documents/). */
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
  } catch {
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
    throw toAppError(error, "Не удалось загрузить файл");
  }
  if (!response.ok) {
    throw toAppError(
      new Error(`Upload failed: ${response.status}`),
      "Не удалось загрузить файл в хранилище",
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
