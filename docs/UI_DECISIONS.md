# UI Decisions

## Session tokens (temporary)

Until medix-core supports HttpOnly cookie refresh:

- **access_token** — in-memory only
- **refresh_token** — `sessionStorage` key `medix.refresh_token.v1`

See ADR-002. **Post-launch review date:** 2026-08-31 (migrate to HttpOnly or renew exception).

## Favorites

Out of MVP — no heart icons / `/favorites`.

## Direct order (F5)

- Verified organization + all cart lines have catalog prices → **«Оформить заказ»** (`POST /orders`).
- Otherwise → RFQ / КП flow.
- Accepting a quote still auto-creates order + verifies (UAT product decision).

## Notifications

In-app list at `/notifications` + bell badge in AppShell (API `/notifications`).

## Design source

Visual tokens and screen IA from `lovable design/`; no mock `data/` or `store/` imports.
See `design-system/MASTER.md`.
