import { z } from "zod";

const envSchema = z.object({
  VITE_PUBLIC_API_BASE_URL: z
    .string()
    .url()
    .default("http://localhost:8000/api/v1"),
});

export type AppEnv = {
  /** Browser-safe API base including `/api/v1`. */
  publicApiBaseUrl: string;
};

function readViteEnv(): Record<string, string | undefined> {
  try {
    return import.meta.env as Record<string, string | undefined>;
  } catch {
    return {};
  }
}

/**
 * Validates and returns app environment.
 */
export function getEnv(): AppEnv {
  const vite = readViteEnv();
  const publicRaw =
    vite.VITE_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

  const parsed = envSchema.safeParse({
    VITE_PUBLIC_API_BASE_URL: publicRaw.replace(/\/$/, ""),
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid frontend env: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }

  return {
    publicApiBaseUrl: parsed.data.VITE_PUBLIC_API_BASE_URL.replace(/\/$/, ""),
  };
}

export function getApiBaseUrl(): string {
  return getEnv().publicApiBaseUrl;
}
