# Medix Web Frontend

Production SPA for Medix International. Design reference: `../lovable design` (do not evolve as production).

## Stack

React 19 · Vite · TypeScript · TanStack Router/Query · Tailwind CSS 4 · Zod · Vitest · MSW

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

App: http://localhost:8080  
API: http://localhost:8000/api/v1 (`medix-core` docker)

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server :8080 |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run test` | Vitest |
| `npm run generate:api` | OpenAPI → `src/api/generated/openapi.ts` |

## Docs

See `docs/ARCHITECTURE.md` and ADRs under `docs/ADR/`.
