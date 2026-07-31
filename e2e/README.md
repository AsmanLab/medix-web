# Playwright E2E (#34 + #35)

## Prerequisites
- API running (Docker medix-core) at `http://127.0.0.1:8000`
- **`SMS_NIKITA_API_KEY` пуст** — иначе мок-OTP выключен, `send-otp` отвечает
  503 «SMS-шлюз недоступен», и ни один сценарий с регистрацией не пройдёт.
  Это самая частая причина падений: стенд поднят, API отвечает, а
  зарегистрироваться нельзя.
- **Свободный лимит `/auth/*`** — 3 `send-otp` на номер и 20 на IP за 10 минут
  (`RATE_LIMIT_*`). Полный прогон укладывается, но подряд идущие повторы упрутся
  в 429. На выделенном стенде проще выставить `RATE_LIMIT_ENABLED=false`.
- **Актуальный образ API.** Контейнер, собранный до последних миграций, отдаёт
  старую схему: проверьте, что `/openapi.json` содержит `/cart` и `/managers`,
  иначе пересоберите (`docker compose up --build -d migrate api worker`).
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
Job `e2e` в `.github/workflows/ci.yml`. Если задан секрет `E2E_API_BASE_URL`,
сценарии гоняются против стенда и **недоступный API роняет job** — молчаливый
skip запрещён (`requireApi` в `helpers.ts`). Если секрет не задан, сценарии
пропускаются, а job печатает warning: зелёный статус в этом случае не означает,
что что-то проверено.

## Specs
### #34 client
1. `01-register-catalog-rfq` — register → product → cart → RFQ
2. `02-quote-accept-invoice` — manager quote (API) → accept → invoice publish
3. `03-verification-gate` — unverified modal on submit

### #35 admin
4. `04-admin-flows` — category+product+publish; verify client; banner via API→home; manager take RFQ + quote UI  
   Note: admin banners page is still a stub — Test 3 uses API create + home assert.
