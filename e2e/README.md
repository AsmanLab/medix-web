# Playwright E2E (#34 + #35)

## Prerequisites
- API running (Docker medix-core) at `http://127.0.0.1:8000`
- Published products in catalog (Test 4 / #34 quote flows)
- Dev OTP `123456`
- Staff fixtures: manager `996700999002` / admin `996700999001`, password `SecurePass1`

## Run locally
```bash
cd frontend
npm ci
npx playwright install chromium
npm run test:e2e
```

UI mode: `npm run test:e2e:ui`

## Env overrides
| Variable | Default |
|----------|---------|
| `E2E_API_BASE_URL` | `http://127.0.0.1:8000/api/v1` |
| `E2E_BASE_URL` | `http://127.0.0.1:8080` |
| `E2E_SKIP_WEBSERVER=1` | use already running `npm run dev` |
| `E2E_MANAGER_PHONE` / `E2E_ADMIN_PHONE` | Postman fixtures |

## CI
Job `e2e` in `.github/workflows/ci.yml` — against staging when `E2E_API_BASE_URL` is set; otherwise specs skip via `apiHealthy()`.

## Specs
### #34 client
1. `01-register-catalog-rfq` — register → product → cart → RFQ
2. `02-quote-accept-invoice` — manager quote (API) → accept → invoice publish
3. `03-verification-gate` — unverified modal on submit

### #35 admin
4. `04-admin-flows` — category+product+publish; verify client; banner via API→home; manager take RFQ + quote UI  
   Note: admin banners page is still a stub — Test 3 uses API create + home assert.
