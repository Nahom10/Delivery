# AllFreshMart Telegram Mini App

Phase 1 of the AllFreshMart ordering system: Telegram registration/authentication, catalog and promotions, cart, pickup-and-cash checkout, and basic product administration.

## Architecture and assumptions

- **Mini App:** React + Vite + Tailwind. It uses Telegram theme parameters, haptics, and the native Main Button when it is running in Telegram.
- **API/Bot:** an Express service receives Telegram webhooks and owns all user identification, product/order writes, and admin authorization.
- **Authentication bridge:** the API verifies Telegram `initData` using the Bot token HMAC. It then creates a short-lived application JWT containing `telegram_user_id` and application-role claims. In production this JWT must be signed with `SUPABASE_JWT_SECRET`, so Supabase/PostgREST RLS can read the `telegram_user_id` claim. Its JWT `role` stays `authenticated`; application RBAC is carried in `app_role`. The browser never talks to privileged Supabase APIs.
- **Persistence:** the app intentionally runs with a clearly labelled seeded development store when Supabase credentials are absent. Apply the included migration and provide service-role credentials before deploying; Phase 2 replaces the dev address placeholder with PostGIS-backed delivery data.
- **Business defaults:** ETB, shop location left unconfigured, English only until Phase 4, pickup + cash only in this milestone. Seeded products and promotions are test data.

## Run Phase 1

1. Copy `.env.example` to `.env` and set `BOT_TOKEN` plus a long `APP_JWT_SECRET`. For a local browser preview, `BOT_TOKEN` may be blank; the API then accepts only explicitly labelled development init data.
2. Install packages with `npm install`.
3. Start the API: `npm run dev:api`.
4. In another terminal, start the Mini App: `npm run dev:web`.
5. Open `http://localhost:5173`. The development preview presents a seeded customer identity. Telegram supplies the real identity once launched as a Mini App.
6. Run the milestone tests with `npm test`.

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
2. Run `supabase/migrations/0001_phase_one.sql` using the Supabase SQL editor or CLI.
3. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWT_SECRET`. The service-role key is server-only.
4. Set `APP_JWT_SECRET` equal to `SUPABASE_JWT_SECRET` for the documented direct RLS-compatible bridge, or keep it distinct if only the API will access Supabase. This Phase 1 adapter keeps development data in memory; production adapter wiring is deliberately a deployment checklist item before launch.

The RLS policies read `telegram_user_id` from verified JWT claims. Do not use `initDataUnsafe` as backend authentication and do not expose Bot, Supabase service-role, or Telebirr credentials to the client.

## API overview

- `POST /api/auth/telegram` — verifies Telegram init data and returns a short-lived session token.
- `POST /api/telegram/webhook` — Bot `/start` and contact-share registration.
- `GET /api/storefront` — active banners, today’s deals, categories, and catalog.
- `POST /api/orders` — pickup + cash checkout (requires a verified app session).
- `GET|POST|PATCH /api/admin/products` — role-gated product management.

## Testing the phases

Phase 1 acceptance tests cover Telegram HMAC validation, scheduled promotion visibility, cart/order totals, pickup/cash validation, and admin role protection. Test this milestone in Telegram using a test bot before moving to Phase 2. Phase 2 starts only after the above flows are approved; it adds maps, fee rules, zones, and distance tests. Telebirr remains out of scope until Phase 4 and must use sandbox credentials first.

## Required configuration before launch

- Production `BOT_TOKEN`, Supabase project, and a public HTTPS Mini App/API URL.
- A fixed shop origin coordinate and ETB delivery rules (Phase 2).
- OpenRouteService/Mapbox key if driving distances are required, otherwise the documented Haversine fallback.
- Telebirr sandbox credentials (Phase 4); production credentials only in Phase 5.
