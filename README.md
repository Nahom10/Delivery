# AllFreshMart Telegram Mini App

AllFreshMart ordering system built through Phase 4: Telegram registration/authentication, catalog and promotions, cart, delivery & maps, order lifecycle with staff/rider operations and bot notifications, Telebirr payments (sandbox + mock), customer order history, full English/Amharic i18n, and an admin dashboard.

## Architecture and assumptions

- **Mini App:** Next.js App Router + React + Tailwind. It uses Telegram theme parameters, haptics, and the native Main Button when it is running in Telegram. The Leaflet picker is client-only because it requires browser map APIs.
- **API/Bot:** an Express service receives Telegram webhooks and owns all user identification, product/order writes, and admin authorization.
- **Authentication bridge:** the API verifies Telegram `initData` using the Bot token HMAC. It then creates a short-lived application JWT containing `telegram_user_id` and application-role claims. In production this JWT must be signed with `SUPABASE_JWT_SECRET`, so Supabase/PostgREST RLS can read the `telegram_user_id` claim. Its JWT `role` stays `authenticated`; application RBAC is carried in `app_role`. The browser never talks to privileged Supabase APIs.
- **Persistence:** the app intentionally runs with a clearly labelled seeded development store when Supabase credentials are absent. Apply the included migrations and provide service-role credentials before deploying; the production schema uses PostGIS-backed address points and delivery zones.
- **Business defaults:** ETB, shop location left unconfigured, English/Amharic runtime switch, pickup + delivery, cash + Telebirr (sandbox/mock until launch). Seeded products and promotions are test data.

## Run Phases 1–2

1. Copy `.env.example` to `.env` and set `BOT_TOKEN` plus a long `APP_JWT_SECRET`. For a local browser preview, `BOT_TOKEN` may be blank; the API then accepts only explicitly labelled development init data.
2. Install packages with `npm install`.
3. Start the unified Next app: `npm run dev`.
4. Open `http://localhost:3000`. The development preview presents a seeded customer identity. Telegram supplies the real identity once launched as a Mini App.
5. `npm run dev:api` remains available only for isolated API work on port 3001.
6. Run the milestone tests with `npm test`.

## Deploy on Vercel

This repository deploys as **one Next.js Vercel project**: the App Router serves the Mini App from `/`, and [`pages/api/[...path].js`](pages/api/[...path].js) exposes the existing Express API at `/api/*`. The handler does not call `listen()` on Vercel.

1. Import the repository in Vercel and leave **Root Directory** set to the repository root — do **not** set it to `apps/api` or `apps/web`.
2. Set Framework Preset to **Next.js**. The tracked build command is `npm run build`; do not use an `apps/api` Root Directory or a separate output directory.
3. Add the server-side environment variables from `.env.example` in Vercel. Set `WEB_ORIGIN` to the final Mini App URL and never expose `BOT_TOKEN`, `APP_JWT_SECRET`, Supabase service-role, or Telebirr credentials as `NEXT_PUBLIC_*` values.
4. Leave `NEXT_PUBLIC_API_URL` blank (or remove it). Requests use same-origin `/api/*` in both local Next development and Vercel.
5. Redeploy, then verify `https://<your-domain>/api/health`. Update BotFather and the Telegram webhook to the resulting HTTPS domain.

If a function still returns 500 after deployment, open its Vercel Runtime Logs; the error will usually identify a missing production environment variable or a deployment whose Root Directory was set incorrectly.

## Telegram BotFather and webhook setup

1. Create a bot in BotFather and copy its token to `BOT_TOKEN`.
2. Set the Mini App URL through BotFather's menu button, or send an `InlineKeyboardButton` with `web_app: { url: "https://your-mini-app" }`.
3. Register the bot webhook after deployment (use the same random value as `TELEGRAM_WEBHOOK_SECRET`):

   ```text
   https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://api.example.com/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
   ```

4. The `/start` handler stores basic Telegram identity and sends a native contact-share keyboard only to a new user. Returning users receive an **Open AllFreshMart** Mini App button. A user can browse without sharing contact, but checkout requires the verified contact.

## Supabase setup

1. Create a Supabase project and enable the `postgis` extension.
2. Run `supabase/migrations/0001_phase_one.sql`, `0002_delivery_and_maps.sql`, and `0003_order_lifecycle_and_realtime.sql` in order using the Supabase SQL editor or CLI.
3. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWT_SECRET`. The service-role key is server-only.
4. Set `APP_JWT_SECRET` equal to `SUPABASE_JWT_SECRET` for the documented direct RLS-compatible bridge, or keep it distinct if only the API will access Supabase. This Phase 1 adapter keeps development data in memory; production adapter wiring is deliberately a deployment checklist item before launch.

The RLS policies read `telegram_user_id` from verified JWT claims. Do not use `initDataUnsafe` as backend authentication and do not expose Bot, Supabase service-role, or Telebirr credentials to the client.

## API overview

- `POST /api/auth/telegram` — verifies Telegram init data and returns a short-lived session token.
- `POST /api/telegram/webhook` — Bot `/start` and contact-share registration.
- `GET /api/storefront` — active banners, today’s deals, categories, and catalog.
- `POST /api/delivery/quote` — server-side cart recalculation plus route/distance/fee quote.
- `GET|POST /api/addresses` — verified customer saved delivery addresses.
- `POST /api/orders` — pickup or delivery checkout with cash or Telebirr (requires a verified app session; Telebirr orders return the checkout URL or sandbox mock marker).
- `GET /api/orders/:id/payment` — Telebirr status query/poll fallback.
- `POST /api/payments/telebirr/notify` — Telebirr webhook with signature verification.
- `POST /api/payments/telebirr/sandbox/:id/complete` — sandbox-mock “pay now” button (only when mock mode is active).
- `GET /api/orders/me` — customer order history.
- `GET /api/orders/:id/tracking` — verified customer/rider tracking with live rider-location data during delivery.
- `/operations?role=staff` and `/operations?role=rider` — staff/rider interfaces (English/Amharic).
- `/admin` — the admin dashboard (products with discounts, promotions/banners, orders, delivery rules + zones, riders, users, reports with CSV export).
- `GET|POST|PATCH|DELETE /api/admin/products` — role-gated product management (supports scheduled percentage/fixed discounts).
- `GET|POST|PATCH|DELETE /api/admin/promotions` — role-gated banner/promotion management.
- `GET|PATCH /api/admin/delivery/rules` and `GET|POST|PATCH /api/admin/delivery/zones` — delivery fee rules and service-area zones.
- `GET /api/admin/reports` and `GET /api/admin/reports.csv` — sales + promotion performance reports.

## Testing the phases

Phase 1–4 acceptance tests cover Telegram HMAC validation, scheduled promotions, cart/order totals, delivery rules, geographic zones, a delivery checkout with a saved pin, lifecycle permissions, proof-of-delivery requirements, and rider tracking. Test this milestone in Telegram using a test bot. Telebirr must use sandbox credentials before Phase 5.

## Required configuration before launch

- Production `BOT_TOKEN`, Supabase project, and a public HTTPS Mini App/API URL.
- A fixed shop origin coordinate and ETB delivery rules. The included Addis Ababa coordinates are placeholders and must be replaced.
- `OPENROUTESERVICE_API_KEY` for driving distances. Without it, the API uses the documented Haversine fallback multiplied by 1.3, and labels the estimate in checkout.
- Telebirr sandbox credentials (Phase 4); production credentials only in Phase 5.

## Production deployment checklist (Phase 5)

1. **Rotate any leaked credentials.** If a Supabase service-role key was ever committed or shared, regenerate it in the Supabase dashboard before going live. The `.env.example` ships with placeholders only — never commit real keys.
2. **Apply the Supabase migrations** (`supabase/migrations/0001..0003` in order) and enable the `postgis` extension, then set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWT_SECRET`. Set `APP_JWT_SECRET` equal to `SUPABASE_JWT_SECRET` so the app JWT works with RLS claims directly.
3. **Wire the production adapter.** The repository ships with a seeded in-memory development store (`createDevelopmentRepository`). Before launch, implement the Supabase-backed repository (service-role client, table access via the migration schema) and swap it in where the development repository is created — the API surface stays identical.
4. **Set real business values.** Replace the placeholder shop origin (`deliverySettings.origin`) and delivery fee rules, seed real products/categories, and remove the demo banners.
5. **Point the Telegram webhook** at the deployed HTTPS URL with `TELEGRAM_WEBHOOK_SECRET`, and set BotFather's menu button / inline button to the Mini App URL.
6. **Verify all env vars in the hosting platform** (Vercel env vars, not client-exposed `NEXT_PUBLIC_*`): `BOT_TOKEN`, `APP_JWT_SECRET`, Supabase keys, `WEB_ORIGIN`, `MINI_APP_URL`, `OPENROUTESERVICE_API_KEY`, Telebirr credentials.
7. **Confirm RBAC end-to-end**: promote a real Telegram user to `admin` (via `BOOTSTRAP_ADMIN_TELEGRAM_ID` on first `/start`, then manage roles from `/admin`), and verify staff/rider roles gate their endpoints.
8. **Verify `/api/health`** reports `storage` and `telebirr` state as expected, then run a full purchase in production mode: catalog → cart → address pin → fee quote → Telebirr sandbox payment → webhook marks `paid` → staff/rider lifecycle → bot notifications.

### Telebirr credential swap procedure (sandbox → production)

1. Keep `TELEBIRR_ENVIRONMENT=sandbox` while testing. The service uses the sandbox gateway base URLs and mock mode automatically when credentials are absent (`TELEBIRR_SANDBOX_MOCK=true` outside production).
2. Obtain production merchant credentials from Telebirr: `TELEBIRR_FABRIC_APP_ID`, `TELEBIRR_APP_SECRET`, `TELEBIRR_MERCHANT_APP_ID`, `TELEBIRR_MERCHANT_CODE`, RSA `TELEBIRR_PRIVATE_KEY`/`TELEBIRR_PUBLIC_KEY`.
3. Update `TELEBIRR_NOTIFY_URL` to the deployed HTTPS webhook (`https://<your-domain>/api/payments/telebirr/notify`) and register it with Telebirr; the service ignores webhooks whose RSA signature fails and logs every payload for reconciliation.
4. Set `TELEBIRR_ENVIRONMENT=production` and `TELEBIRR_SANDBOX_MOCK=false`, then deploy. Do **not** expose any Telebirr credential as a `NEXT_PUBLIC_*` variable — all signing happens server-side.
5. Run a small production test payment; if a webhook is delayed or missed, the checkout's status-poll fallback (`GET /api/orders/:id/payment`) queries Telebirr so an order never stays `pending` forever.

### Load testing recommendations

- **Delivery fee engine** (`packages/core/src/delivery-fee.js`): it is pure and sync — load-test with a simple concurrent benchmark (e.g. `autocannon` or `k6`) hitting `POST /api/delivery/quote` at the expected peak order rate; with the Haversine fallback it should sustain hundreds of requests/sec per instance. If driving-distance routing is enabled, cache route results by rounded origin/destination coordinates to avoid burning OpenRouteService quota.
- **Telebirr webhook endpoint** (`POST /api/payments/telebirr/notify`): it must be idempotent — replays and duplicates should update payment status without creating side effects. Test with replayed payloads and confirm the raw-payload log grows only on genuinely new events.
- **Order status API**: run lifecycle transitions concurrently on the same order and confirm the state machine rejects invalid transitions (the `order-lifecycle` tests cover this; the in-memory repository serializes writes).
- **Mini App startup**: keep the home bundle light (banner images compressed) so the storefront still opens near-instantly inside the Telegram WebView; measure with the browser's network panel or Lighthouse on the deployed URL.
