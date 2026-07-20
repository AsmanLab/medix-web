# ADR-001: Lovable is design-only

## Status

Accepted — 2026-07-20

## Context

`lovable design/` was a TanStack Start prototype with mocks. Evolving it as production mixed demo state with API and blocked clean standards.

## Decision

Production frontend lives in `AsmanLab/medix-web` (local `frontend/`). Lovable remains a visual/IA reference only.

## Consequences

- Copy UI patterns selectively; reimplement data/auth.
- Do not rename the Lovable folder (OneDrive/sync).
- Team onboards on medix-web README + ARCHITECTURE.md.
