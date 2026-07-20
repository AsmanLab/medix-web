# ADR-002: Session token storage

## Status

Accepted (temporary) — 2026-07-20

## Context

medix-core returns JWT access + refresh in JSON body. HttpOnly cookie auth is not available yet.

## Decision

- Access token: memory only (cleared on tab close / reload until bootstrap).
- Refresh token: `sessionStorage` (`medix.refresh_token.v1`) for F5 survival.
- Bind token getter synchronously at session module load (before first API call).
- Single-flight refresh on 401.

## Consequences

XSS can read refresh token — document risk; migrate to HttpOnly cookies when backend supports it.
