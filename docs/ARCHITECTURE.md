# Architecture — medix-web

## Boundaries

| Path | Role |
|------|------|
| `AsmanLab/medix-web` / local `frontend/` | Production web frontend |
| `AsmanLab/Medix` / `medix-core/` | Backend API |
| `lovable design/` | Design reference only |

## Layers

```text
routes/ → features/ (later) → api/ + session/
                ↓
         TanStack Query
                ↓
         api/client.ts → medix-core /api/v1
```

- **`api/`** — only HTTP; types from OpenAPI.
- **`session/`** — auth state; access in memory, refresh in `sessionStorage` (temporary).
- **`routes/`** — TanStack file routes + guards.
- **`components/ui`** — primitives; **`components/shared`** — shells/states.

## Role zones

| Role | Prefix |
|------|--------|
| client | `/`, `/catalog`, `/profile`, `/orders` |
| admin | `/admin` |
| manager | `/manager` |
| service_engineer | `/engineer` |

## Phases

G0 foundation → G1 auth → G2 shells → G3 catalog/CMS → G4 profile → G5 commerce → G6 notifications/service → G7 admin → G8 staff → G9 hardening.
