# ADR-002: Session token storage

## Status

Accepted (temporary) — 2026-07-20  
**Exception renewed for production launch** — review by **2026-08-31**.

## Context

medix-core returns JWT access + refresh in JSON body. HttpOnly cookie auth is not available yet.

## Decision

- Access token: memory only (cleared on tab close / reload until bootstrap).
- Refresh token: `sessionStorage` (`medix.refresh_token.v1`) for F5 survival.
- Bind token getter synchronously at session module load (before first API call).
- Single-flight refresh on 401.

## Threat model (accepted risk)

XSS can read refresh token. Mitigations: CSP when available, dependency updates, short refresh TTL on backend, no long-lived tokens in `localStorage`.

## Consequences

Must migrate to HttpOnly + Secure + SameSite cookies when backend supports set-cookie refresh; until then document this exception in release checklist.
