/**
 * Session roles and landing paths.
 */

export type UserRole = "client" | "manager" | "service_engineer" | "admin";

export type SessionUser = {
  userId: string;
  role: UserRole;
  phone?: string;
};

export type SessionState = {
  status: "anonymous" | "authenticated" | "bootstrapping";
  user: SessionUser | null;
  accessToken: string | null;
};

export const initialSessionState: SessionState = {
  status: "anonymous",
  user: null,
  accessToken: null,
};

/** Role → default landing path after login. */
export function landingPathForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "manager":
      return "/manager";
    case "service_engineer":
      return "/engineer";
    default:
      return "/profile";
  }
}
