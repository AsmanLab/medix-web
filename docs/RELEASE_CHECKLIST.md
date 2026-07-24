# Release checklist — medix-web

## Pre-release

- [ ] `npm run typecheck` / CI green
- [ ] `npm run test` + critical Playwright E2E against staging API
- [ ] Staging smoke: home images, cart RFQ, accept KP → order, banners admin, logout
- [ ] OTP path known (Nikita or mock `123456` if key empty)
- [ ] Invoice publish → PDF within ~1 min (worker + R2)
- [ ] `VITE_API_BASE_URL` points to intended API
- [ ] `VITE_SENTRY_DSN` set for production (optional on preview)
- [ ] ADR-002 session exception still valid or HttpOnly shipped

## Deploy

- [ ] Vercel production promote / merge to main
- [ ] API + worker redeployed (Railway or VPS)
- [ ] `robots.txt` / `sitemap.xml` reachable
- [ ] Health: `/api/v1/...` docs + catalog list

## Rollback

- [ ] Vercel: previous deployment Instant Rollback
- [ ] Railway/VPS: previous image/commit
- [ ] Communicate status on #39 / ops channel

## Post-release (72h)

- [ ] Watch Sentry + Railway logs
- [ ] UAT sign-off written confirmation
- [ ] Medix API issue #21 monitoring
