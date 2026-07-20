# UI Decisions

## Session tokens (temporary)

Until medix-core supports HttpOnly cookie refresh:

- **access_token** — in-memory only
- **refresh_token** — `sessionStorage` key `medix.refresh_token.v1`

See ADR-002.

## Favorites

Out of MVP — no heart icons / `/favorites`.

## Design source

Visual tokens and screen IA from `lovable design/`; no mock `data/` or `store/` imports.
