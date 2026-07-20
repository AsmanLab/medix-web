import type { UserRole } from "@/session/roles";

type JwtPayload = {
  sub?: string;
  role?: string;
  exp?: number;
};

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const raw = padded + pad;
  if (typeof atob === "function") {
    return atob(raw);
  }
  throw new Error("base64 decode unavailable");
}

const ROLES: UserRole[] = ["client", "manager", "service_engineer", "admin"];

export function decodeAccessToken(token: string): {
  userId: string;
  role: UserRole;
  exp?: number;
} | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return null;
    const json = base64UrlDecode(parts[1]);
    const payload = JSON.parse(json) as JwtPayload;
    if (!payload.sub || !payload.role) return null;
    if (!ROLES.includes(payload.role as UserRole)) return null;
    return {
      userId: payload.sub,
      role: payload.role as UserRole,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
