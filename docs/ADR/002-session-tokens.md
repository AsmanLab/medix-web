# ADR-002: Session token storage

## Status

Superseded — 2026-09-10. `sessionStorage` exception below no longer applies; see
"Decision (current)". Original text kept for history.

## Context

medix-core returns JWT access + refresh in JSON body. HttpOnly cookie auth is not available yet.

## Decision (current, 2026-09-10)

PWA installs (`display: standalone`) get evicted by the OS between launches, and
`sessionStorage` does not survive that — this forced a re-login (and, since push
resubscription is tied to being logged in, silently broke push delivery) on nearly every
cold start. Backend now supports HttpOnly refresh cookies (`medix-core/app/modules/identity/presentation/cookies.py`), so:

- Access token: memory only (cleared on tab close / reload until bootstrap).
- Refresh token: HttpOnly; Secure; SameSite=Lax cookie (`medix_refresh`), set/read entirely
  server-side — the frontend never sees it, not even through XSS.
- A second, non-HttpOnly cookie (`medix_session`) marks "a session may exist" so the frontend
  can skip the refresh round-trip for anonymous visitors instead of reading `document.cookie`
  for the (inaccessible) refresh token itself.
- Bind token getter synchronously at session module load (before first API call).
- One shared single-flight refresh promise for both cold-start bootstrap and the 401-retry
  path (`frontend/src/session/store.ts`) — previously these were two independent promises that
  could race and exchange the same refresh token concurrently.
- Network/timeout/5xx/429 errors during refresh no longer clear the session — only a definite
  401/403 does. A dropped connection during a PWA cold start must not silently log the user out.
- Mobile app (separate Flutter codebase) contract unchanged: `refresh_token` still accepted in
  the request body and returned in the response body; the cookie is purely additive.

## Original decision (2026-07-20, superseded)

- Access token: memory only (cleared on tab close / reload until bootstrap).
- Refresh token: `sessionStorage` (`medix.refresh_token.v1`) for F5 survival.
- Bind token getter synchronously at session module load (before first API call).
- Single-flight refresh on 401.

### Threat model (accepted risk, historical)

XSS can read refresh token. Mitigations: CSP when available, dependency updates, short refresh TTL on backend, no long-lived tokens in `localStorage`.

### Consequences (historical)

Must migrate to HttpOnly + Secure + SameSite cookies when backend supports set-cookie refresh; until then document this exception in release checklist.
