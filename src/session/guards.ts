import { redirect } from "@tanstack/react-router";
import {
  bootstrapSession,
  getSessionSnapshot,
  hasRole,
  landingPathForRole,
  type UserRole,
} from "@/session/store";

export type GuardOptions = {
  roles?: UserRole[];
  loginTo?: "/login";
};

function redirectToLanding(role: UserRole): never {
  const path = landingPathForRole(role);
  if (path === "/admin") throw redirect({ to: "/admin" });
  if (path === "/manager") throw redirect({ to: "/manager" });
  if (path === "/engineer") throw redirect({ to: "/engineer" });
  throw redirect({ to: "/profile" });
}

/**
 * Ensure session is bootstrapped, then require authentication (+ optional roles).
 */
export async function requireAuth(options: GuardOptions = {}) {
  await bootstrapSession();
  const session = getSessionSnapshot();
  const loginTo = options.loginTo ?? "/login";

  if (session.status !== "authenticated" || !session.user) {
    throw redirect({
      to: loginTo,
      search: {
        redirect:
          typeof window !== "undefined"
            ? window.location.pathname
            : undefined,
        phone: undefined,
      },
    });
  }

  if (options.roles?.length && !hasRole(session.user, options.roles)) {
    redirectToLanding(session.user.role);
  }

  return session;
}

/** Guest-only routes (login/register). Authenticated users go to role landing. */
export async function requireGuest() {
  await bootstrapSession();
  const session = getSessionSnapshot();
  if (session.status === "authenticated" && session.user) {
    redirectToLanding(session.user.role);
  }
  return session;
}

export async function requireAdmin() {
  return requireAuth({ roles: ["admin"], loginTo: "/login" });
}
