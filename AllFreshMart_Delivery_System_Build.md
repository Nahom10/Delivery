# Build Prompt: AllFreshMart Online Ordering & Delivery System

> **How to use this file:** Copy everything below the line into your AI coding agent (Claude Code, Cursor, etc.) as the first message / project brief. It's written as a complete spec so the agent can plan and build without needing to guess at requirements. Replace bracketed `[ ]` values with your real details before sending.

---

## PROMPT START

You are acting as a senior full-stack engineer and technical architect. Build a **production-grade online ordering and delivery system** for **AllFreshMart**, a fruit and vegetable supermarket, delivered as a **Telegram Mini App**. Plan the architecture first, confirm it with me in a short summary, then build it in phases (see "Build Phases" below). Ask me clarifying questions only when a decision materially changes the architecture — otherwise make a sensible default choice and note the assumption.

### 0. Platform: Telegram Mini App
- The storefront runs **inside Telegram** as a Mini App (Telegram Web App), opened from a bot via a menu button / inline "Order Now" button.
- Use the **Telegram Web App JS SDK** (`window.Telegram.WebApp`) for:
  - Reading the authenticated Telegram user (`initDataUnsafe`) — no separate signup/login screen needed for customers.
  - **Server-side validation of `initData`** on every request that identifies the user (HMAC check against the bot token) — never trust `initDataUnsafe` on the backend without verifying it.
  - Native UI integration: `MainButton` / `BackButton` for primary actions (e.g. "Place Order — 350 ETB"), `HapticFeedback` for interactions, and `themeParams` so the app automatically matches the user's Telegram light/dark theme instead of shipping its own clashing theme.
  - `requestLocation` / native location sharing as a fast-path alternative to manually dragging the map pin, where the Telegram client version supports it.
- A companion **Telegram Bot** (via BotFather) handles:
  - The entry point / menu button that launches the Mini App.
  - **Order status notifications pushed as bot messages** — this replaces SMS for most updates and is free, instant, and native to the platform. Keep email/SMS as an optional fallback for order types that need it (e.g. large corporate orders), not the primary channel.
  - Optionally, a lightweight chat-based reorder flow ("Order your usual again?") using bot commands.
- Because it runs in a Telegram WebView, keep the UI touch-first, avoid anything that assumes a browser chrome (address bar, tabs), and keep initial load fast — Telegram Mini Apps are expected to open near-instantly.

### 0.1 Customer Registration Flow (bot-driven, no signup form)
Registration happens automatically through the bot, not through a form in the Mini App:
1. Customer sends **`/start`** to the bot (or opens it for the first time).
2. Bot checks Supabase for an existing user matching this `telegram_user_id`.
   - **Existing user:** skip straight to a welcome-back message with a button to open the Mini App. No re-prompting.
   - **New user:** continue to step 3.
3. Bot sends a welcome message and immediately captures what Telegram already knows, no typing required from the customer:
   - `telegram_user_id`, `username`, `first_name`, `last_name`, `language_code` — all available directly from the `/start` update.
4. Bot requests the phone number via Telegram's **native contact-share button** (a `KeyboardButton` with `request_contact: true`, or `Telegram.WebApp.requestContact()` if triggered from inside the Mini App instead of the chat) — **phone number is not included in `initData` by default and must be explicitly requested this way.** Show a short reason ("so our rider can reach you on delivery") since customers are more likely to share when they understand why.
   - On share, Telegram returns the verified phone number tied to their account — trust this over any manually-typed number.
   - **If the customer declines:** don't block registration — let them browse and add to cart, but require phone sharing (or a manually entered + backend-validated number) before the **first checkout**, since delivery/pickup coordination depends on a working contact number.
5. Write the captured fields to the Supabase `users` table, keyed by `telegram_user_id`, and issue the Supabase-compatible session (per the `initData`-verification bridge described in section 5) so the rest of the app treats them as authenticated.
6. Optionally fetch their Telegram profile photo (`getUserProfilePhotos` Bot API call) to personalize the account/profile screen — nice-to-have, not required for v1.
- Name and username can change on Telegram's side over time — re-sync `first_name`/`last_name`/`username` from `initData` on every session rather than only at first registration, so the stored profile doesn't go stale.
- The customer never sees a traditional "create account" form anywhere in this flow — registration should feel like nothing more than tapping "Share Contact" once.

### 1. Business Context

- Business: retail supermarket selling fresh fruits, vegetables, and grocery items.
- Location: [Shop address, e.g. Addis Ababa, Ethiopia] — this is the single origin point delivery distance is measured from. Support for multiple branches should be possible later but is not required for v1.
- Currency: [ETB / your currency]
- Languages: English and Amharic (full UI translation, not just labels — plan for a translation-key system from day one, not hardcoded strings).
- Order types customers can choose at checkout:
  1. **Home Delivery** — delivered to a specified address, cost calculated automatically by distance.
  2. **Store Pickup** — customer collects the order in-store, no delivery fee.

### 2. User Roles

| Role | Capabilities |
|---|---|
| **Customer** | Registers automatically via bot `/start` + contact share (see 0.1) — no signup form. Browse/search products, manage cart, checkout, choose delivery or pickup, pay, track order status, view order history, save multiple addresses |
| **Delivery Rider** | View assigned deliveries, see route/map, update order status (picked up → en route → delivered), capture proof of delivery (photo or signature) |
| **Shop Staff** | View incoming orders, mark items as packed/ready, manage stock levels, mark pickup orders as collected |
| **Admin** | Everything above, plus: manage product catalog & pricing, manage delivery fee rules, view sales/delivery reports, manage staff and rider accounts, manage delivery zones/exclusions |

### 3. Core Feature Requirements

#### 3.1 Storefront (Customer-Facing)
- Product catalog with categories (e.g. Vegetables, Fruits, Herbs, Packaged Goods), search, and filters.
- Product cards show price per unit (kg / piece / bunch — support mixed units), stock availability, and a photo.
- Cart with quantity adjustment, running total, and estimated delivery fee shown **before** final checkout (updates live as address changes).
- Guest checkout allowed, but account creation encouraged for order history and saved addresses.
- Order confirmation screen + confirmation pushed as a Telegram bot message (see Platform section).

#### 3.1.1 Homepage Promotions / "Today's Discount" Area
The home screen needs a dedicated, admin-controlled promotional area at the top, above the regular catalog — this is what drives repeat opens of the Mini App, not just a static discount label:
- A **banner carousel** (swipeable, auto-advancing) at the very top of the home screen for time-boxed promotions — e.g. "Today's Discount: Tomatoes 20% off," "Weekend Fruit Bundle," a seasonal campaign image, etc. Each banner links either to a specific product, a category, or a filtered "on sale" product list.
- A **"Today's Deals" product rail** directly below the banner — a horizontally scrollable row of products currently on discount, each card showing the original price struck through next to the discounted price and a percentage-off badge.
- Individual product cards anywhere in the catalog (not just the deals rail) should show the same discount badge/strikethrough automatically whenever that product has an active discount — the discount shouldn't only be visible in the promo rail.
- Support **scheduled promotions**: admin sets a start time and end time (e.g. discount valid only today, or Fri–Sun), and the system automatically shows/hides it without manual intervention — this is what makes "today's discount" actually mean today.
- Support two discount mechanisms the admin can choose from per promotion:
  1. **Product-level discount** — percentage or fixed-amount off specific product(s).
  2. **Banner-only announcement** — a promotional image/message with no attached discount logic (e.g. "New: Avocados back in stock"), for cases that don't need pricing logic at all.
- Empty state: if there are no active promotions, the banner area should collapse gracefully rather than show a placeholder — don't make the home screen feel broken on a day with no active deals.
- Since this is inside a Telegram Mini App, keep banner images lightweight (compressed, correctly sized for mobile) so the home screen still opens near-instantly per the platform requirement in section 0.

#### 3.2 Delivery Address & Map System
This is the core differentiator — build it carefully:
- Address capture via an interactive map (pin drop / drag to adjust), **not just a text field**.
- Structured address fields alongside the map pin, matching local addressing conventions:
  - House number
  - Block number / house number cluster
  - Street name / area name
  - Landmark / nearest known reference point (common in areas without formal street addresses)
  - Floor/unit number (for apartments)
  - Delivery notes (free text, e.g. "call on arrival", "gate code 1234")
- Reverse-geocode the pin to auto-fill a human-readable address, but always let the customer override the auto-filled text.
- Customers can save multiple addresses (Home, Work, etc.) and select one at checkout.
- Validate the pin falls within a serviceable delivery radius (see delivery zones below); if outside, clearly tell the customer and offer pickup instead.

#### 3.3 Automatic Distance-Based Delivery Cost Engine
- On address selection, calculate the driving (or straight-line, see note) distance in kilometers from the shop's fixed origin coordinates to the customer's pinned location.
- Delivery fee formula (make this configurable by the admin, not hardcoded):
  - `delivery_fee = base_fee + (distance_km × per_km_rate)`
  - Example starting values: base fee = [30 ETB] covering the first [2 km], then [8 ETB] per additional km.
  - Support a **free delivery threshold** (e.g. orders above [500 ETB] get free delivery within [5 km]).
  - Support a **maximum serviceable distance** — beyond it, delivery is disabled and only pickup is offered.
  - Round the final fee to the nearest whole currency unit.
- Recalculate the fee live in the cart/checkout screen whenever the address changes — never let the customer pay a stale fee.
- Store the exact distance and fee breakdown on the order record for auditing and rider payment purposes.
- **Technical note for the agent:** use a real routing/distance API (e.g. Google Distance Matrix API, Mapbox, or OpenRouteService) for driving distance where budget allows; fall back to a Haversine straight-line calculation with a padding multiplier (e.g. ×1.3) if no routing API key is configured, so the system still works out of the box in development.

#### 3.4 Order Lifecycle
```
Placed → Confirmed by Shop → Preparing/Packing →
  [Delivery path]: Out for Delivery → Delivered
  [Pickup path]: Ready for Pickup → Collected
→ Completed (with optional Cancelled / Refunded states at any point before fulfillment)
```
- Each transition should trigger a customer notification via **Telegram bot message** (primary channel — see Platform section), with email/SMS as an optional secondary channel.
- Customers can view live status and, for delivery orders, the rider's live location on a map once "Out for Delivery."

#### 3.5 Payments — Telebirr Integration
- Primary digital payment method: **Telebirr** (merchant/H5 payment flow). Also support **Cash on Delivery/Pickup** as a fallback for customers who prefer it.
- Telebirr integration must be handled **entirely server-side** — the request-signing (RSA) and merchant credentials (App ID, App Key, Public Key, Short Code) must never be exposed to the client:
  1. Backend creates a payment order (`applyFold`/create-order call) with Telebirr's API when the customer confirms checkout, passing the order total, a unique merchant order ID, and a callback/notify URL.
  2. Customer is redirected into the Telebirr payment flow (H5 webview) to complete payment — inside the Telegram Mini App this should open as a new Telegram WebApp popup/link, since it's a separate secure payment context.
  3. Telebirr calls the backend's **webhook/notify endpoint** on payment completion — this webhook must verify Telebirr's signature before trusting the payload, then mark the order's payment status accordingly.
  4. Also implement a **status-check/poll fallback** (query Telebirr's order status endpoint) in case the webhook is delayed or missed, so an order never gets stuck in "payment pending" indefinitely.
- Store Telebirr's transaction ID against the order for reconciliation, and keep a raw log of webhook payloads for dispute handling.
- Payment status (`pending`, `paid`, `failed`, `refunded`) is tracked separately from order fulfillment status — a paid order and a delivered order are independent states.
- Use Telebirr's **sandbox/test environment** during Phases 1–3 and only switch to production credentials in the final pre-launch step.

#### 3.6 Admin Dashboard
- Product & inventory management (add/edit/delete, stock levels, low-stock alerts).
- **Promotions/banner management** (create/edit/delete banners and discounts, set start/end times, attach a discount to a product or category, reorder/prioritize which banners show first in the carousel, upload banner images with a required aspect ratio so they render consistently) — see 3.1.1.
- Delivery fee rule configuration (base fee, per-km rate, free-delivery threshold, max radius) — editable without a code deploy.
- Delivery zone management (polygon or radius-based service area, with the option to exclude specific sub-areas).
- Order management with filters by status, date, order type.
- Rider management and delivery assignment (manual or auto-assign to nearest available rider).
- Sales and delivery cost reports (daily/weekly/monthly, exportable to CSV/Excel) — include a **promotion performance report** (views/clicks/orders attributed to each banner or discount) so the admin can tell which promotions actually drive orders.

#### 3.7 Delivery Rider Interface
- List of assigned orders with map + turn-by-turn navigation link (deep link to Google/Apple Maps is acceptable for v1).
- One-tap status updates.
- Proof of delivery capture (photo and/or customer signature).

### 4. Non-Functional Requirements
- Mobile-first responsive design (most customers will order from phones); also usable on desktop.
- Multi-language runtime switch (English/Amharic), not a rebuild-required translation.
- Secure authentication: customers authenticate via **verified Telegram `initData`** (no passwords); admin/staff/rider dashboards (likely a separate web app outside Telegram) use standard hashed-password + JWT/session auth with rate-limited login.
- Role-based access control enforced on the backend, not just hidden in the UI.
- All monetary and distance calculations happen server-side (never trust a client-submitted delivery fee).
- Basic automated tests for the delivery fee engine and order lifecycle, since these are the highest-risk areas for silent bugs.
- Logging/audit trail for price and delivery-rule changes made by admins.

### 5. Tech Stack (fixed for this project)
- Frontend: React (or Next.js in static/SPA mode — Telegram Mini Apps don't benefit from SSR since they're always opened fresh inside the Telegram WebView) + Tailwind CSS, built against the **Telegram Web App JS SDK**.
- Backend: Node.js (NestJS or Express) — needed for `initData` verification, Telebirr's signed requests, and delivery-fee calculation logic that must stay server-side. Can be deployed as **Supabase Edge Functions** (Deno) if you want a single-platform deployment, or as a separate Node service if you prefer more control over the Telebirr signing logic — pick one and be consistent.
- Database & Backend Services: **Supabase**
  - Postgres as the primary database (enable the **PostGIS** extension for geospatial delivery-zone queries and distance calculations).
  - **Row-Level Security (RLS) policies** for every table from day one — this matters more than usual here because Mini App requests are authenticated via verified Telegram `initData`, not Supabase's own auth session, so RLS policies need to key off a verified `telegram_user_id` claim rather than assuming `auth.uid()` is populated normally. Document the auth-bridging approach clearly (e.g. a Supabase Edge Function that verifies `initData` then issues a Supabase-compatible JWT).
  - **Supabase Storage** for product images and delivery proof-of-delivery photos.
  - **Supabase Realtime** for live order status updates and rider location — this is a natural fit for the "live tracking" requirement in 3.4 and avoids building a separate WebSocket layer.
- Maps: **Leaflet + OpenStreetMap tiles** (or Mapbox GL JS) rather than Google Maps — lighter weight inside a Telegram WebView and avoids Google Maps' API key/billing setup for an MVP. Use **OpenRouteService** or **Mapbox Directions API** for driving-distance calculation (both have usable free tiers); fall back to a Haversine straight-line calculation with a padding multiplier (×1.3) if no routing API key is configured.
- Payments: **Telebirr** (see 3.5) for digital payment, Cash on Delivery/Pickup as fallback.
- Notifications: **Telegram Bot API** (primary), with email/SMS (e.g. SendGrid/Twilio) as an optional secondary channel only where needed.
- Hosting: Frontend on Vercel/Netlify (or Supabase Hosting if using Edge Functions end-to-end); keep it simple and avoid unnecessary infrastructure for a Mini App of this scale.

### 5.1 UI/UX Bar
The UI should feel like a premium, purpose-built grocery app — not a generic admin-panel-turned-storefront. Specific direction for the agent:
- Establish a real visual identity before writing components: a fresh, appetizing color palette (greens/earth tones suit a produce brand — avoid defaulting to generic blue/indigo SaaS colors), a clear type scale, and consistent spacing — then apply it everywhere rather than styling screens ad hoc.
- Product photography-first design: large, high-quality product images, clear price-per-unit typography, satisfying add-to-cart micro-interactions (use `HapticFeedback` on add/remove), and a cart that feels immediate, not a separate slow page.
- Respect Telegram's `themeParams` for light/dark mode rather than forcing a fixed theme — the app should feel native to whichever theme the user already has.
- Design the checkout flow (address → delivery fee → payment) as a single smooth stepper, not disconnected pages — this is the highest-friction part of the app and where a generic-feeling UI loses the most trust.
- The homepage promo carousel (3.1.1) is the first thing customers see on every open — give it real motion polish (smooth swipe/auto-advance, not a jarring instant-cut slideshow) since it sets the tone for the whole app's perceived quality.
- Empty states, loading states, and the delivery-fee-calculating moment all need real design attention, not spinner-and-forget — these are the moments customers judge the app's quality by.

### 6. Suggested Data Model (starting point — refine as needed)
`Users` (keyed by `telegram_user_id`; also stores `username`, `first_name`, `last_name`, `phone_number`, `language_code`, `phone_verified` flag, `profile_photo_url`), `Addresses` (linked to Users, includes lat/lng + structured fields above), `Products` (include `discount_type`, `discount_value`, `discount_starts_at`, `discount_ends_at` or a related `ProductDiscounts` table if a product can have multiple scheduled discounts over time), `Categories`, `Promotions`/`Banners` (image, link target, start/end time, priority/sort order, active flag), `Orders`, `OrderItems`, `DeliveryFeeRules`, `DeliveryZones`, `Riders`, `Payments` (with Telebirr transaction references), `Notifications`.

### 7. Build Phases
Build in this order so there's always a working system to review:
1. **Phase 1 — Core commerce + Mini App shell:** Telegram bot with `/start` → contact-share registration flow (0.1), `initData` verification bridge to Supabase, product catalog, cart, checkout (pickup only, cash payment), basic admin product management, and the homepage promo carousel + "Today's Deals" rail (3.1.1) — this belongs in Phase 1 since it's the first thing customers see. This phase proves the Telegram + Supabase auth bridge works before anything else is built on top of it.
2. **Phase 2 — Delivery & maps:** address map picker (Leaflet/Mapbox), distance calculation, dynamic delivery fee engine (Supabase-stored, admin-editable rules), delivery zone limits, PostGIS queries.
3. **Phase 3 — Order lifecycle & roles:** rider interface, staff order management, Supabase Realtime status updates, Telegram bot notifications.
4. **Phase 4 — Payments & polish:** Telebirr sandbox integration end-to-end (including webhook handling), Amharic translation pass, the UI/UX polish pass described in 5.1, reports/analytics.
5. **Phase 5 — Launch:** switch Telebirr to production credentials, load-test the delivery fee engine and webhook endpoint, submit the Mini App / bot for final review inside Telegram.

### 8. What I Need From You (the AI Agent)
1. A short architecture summary and confirmation of assumptions before writing code — especially the `initData` → Supabase auth bridging approach, since that's the riskiest new piece.
2. A working repository structure with clear setup instructions (README covering: BotFather setup, Supabase project setup + RLS policies, required environment variables/API keys for maps and Telebirr).
3. Clean, commented code, organized by feature/module.
4. The delivery fee engine built as an isolated, independently testable module.
5. A note on which parts used a fallback/default (e.g. Haversine distance, sandbox Telebirr credentials) because no real key was provided, so I know exactly what to configure before going live.

## PROMPT END

---

### Notes for you before sending this
- Fill in the bracketed values (shop address, currency, fee amounts) — the more specific you are, the less the agent has to guess.
- You'll need three things ready before Phase 1 can fully complete: a **Telegram bot token** from BotFather, a **Supabase project**, and (for Phase 4) your **Telebirr merchant credentials** (App ID, App Key, Public Key, Short Code) — sandbox credentials are enough until launch.
- If you already have a logo or brand colors, share them up front so the UI/UX pass in section 5.1 has something real to work from instead of picking its own palette.
- For a first build, consider giving this to the agent in the phases above rather than all at once — Phase 1 alone (bot + Mini App shell + Supabase auth bridge) is a solid week-one milestone you can review before continuing.
