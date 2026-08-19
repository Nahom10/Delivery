# AllFreshMart Telegram Mini App

Phases 1–2 of the AllFreshMart ordering system: Telegram registration/authentication, catalog and promotions, cart, pickup/cash checkout, delivery addresses and maps, configurable delivery fees, and basic product administration.

## Architecture and assumptions

- **Mini App:** Next.js App Router + React + Tailwind. It uses Telegram theme parameters, haptics, and the native Main Button when it is running in Telegram. The Leaflet picker is client-only because it requires browser map APIs.
- **API/Bot:** an Express service receives Telegram webhooks and owns all user identification, product/order writes, and admin authorization.
- **Authentication bridge:** the API verifies Telegram `initData` using the Bot token HMAC. It then creates a short-lived application JWT containing `telegram_user_id` and application-role claims. In production this JWT must be signed with `SUPABASE_JWT_SECRET`, so Supabase/PostgREST RLS can read the `telegram_user_id` claim. Its JWT `role` stays `authenticated`; application RBAC is carried in `app_role`. The browser never talks to privileged Supabase APIs.
- **Persistence:** the app intentionally runs with a clearly labelled seeded development store when Supabase credentials are absent. Apply the included migrations and provide service-role credentials before deploying; the production schema uses PostGIS-backed address points and delivery zones.
- **Business defaults:** ETB, shop location left unconfigured, English only until Phase 4, pickup + cash only in this milestone. Seeded products and promotions are test data.

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
2. Run `supabase/migrations/0001_phase_one.sql` and `supabase/migrations/0002_delivery_and_maps.sql` in order using the Supabase SQL editor or CLI.
3. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWT_SECRET`. The service-role key is server-only.
4. Set `APP_JWT_SECRET` equal to `SUPABASE_JWT_SECRET` for the documented direct RLS-compatible bridge, or keep it distinct if only the API will access Supabase. This Phase 1 adapter keeps development data in memory; production adapter wiring is deliberately a deployment checklist item before launch.

The RLS policies read `telegram_user_id` from verified JWT claims. Do not use `initDataUnsafe` as backend authentication and do not expose Bot, Supabase service-role, or Telebirr credentials to the client.

## API overview

- `POST /api/auth/telegram` — verifies Telegram init data and returns a short-lived session token.
- `POST /api/telegram/webhook` — Bot `/start` and contact-share registration.
- `GET /api/storefront` — active banners, today’s deals, categories, and catalog.
- `POST /api/delivery/quote` — server-side cart recalculation plus route/distance/fee quote.
- `GET|POST /api/addresses` — verified customer saved delivery addresses.
- `POST /api/orders` — pickup or delivery checkout with cash (requires a verified app session).
- `GET|POST|PATCH /api/admin/products` — role-gated product management.

## Testing the phases

Phase 1–2 acceptance tests cover Telegram HMAC validation, scheduled promotions, cart/order totals, role protection, contact verification, delivery fee rules, geographic zones, and a delivery checkout with a saved pin. Test this milestone in Telegram using a test bot before moving to Phase 3. Telebirr remains out of scope until Phase 4 and must use sandbox credentials first.

## Required configuration before launch

- Production `BOT_TOKEN`, Supabase project, and a public HTTPS Mini App/API URL.
- A fixed shop origin coordinate and ETB delivery rules. The included Addis Ababa coordinates are placeholders and must be replaced.
- `OPENROUTESERVICE_API_KEY` for driving distances. Without it, the API uses the documented Haversine fallback multiplied by 1.3, and labels the estimate in checkout.
- Telebirr sandbox credentials (Phase 4); production credentials only in Phase 5.
