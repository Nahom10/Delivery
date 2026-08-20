# AllFreshMart Delivery System — Architecture Summary & Implementation Plan

## Current State Assessment

After a thorough audit of every file in the repository, here is what exists and what remains:

### ✅ Already Built (Phases 1–3 + partial Phase 4)

| Feature | Status | Quality |
|---------|--------|---------|
| **Telegram Mini App shell** (Next.js App Router + React) | ✅ Complete | Solid — dynamic imports, SSR-disabled for browser-only components |
| **`initData` HMAC verification** ([telegram-auth.js](file:///c:/Users/User/Downloads/order/apps/api/src/telegram-auth.js)) | ✅ Complete | Production-ready — timing-safe compare, expiry check |
| **JWT auth bridge** ([session.js](file:///c:/Users/User/Downloads/order/apps/api/src/session.js)) | ✅ Complete | HMAC-SHA256, `app_role` + `telegram_user_id` claims, PostgREST-compatible |
| **Bot `/start` + contact-share registration** ([telegram-bot.js](file:///c:/Users/User/Downloads/order/apps/api/src/telegram-bot.js)) | ✅ Complete | Correct contact mismatch check, welcome-back vs new-user flow |
| **Product catalog, categories, seeded data** | ✅ Complete | 6 products, 4 categories, 2 banners with scheduled time windows |
| **Homepage promo carousel + "Today's Deals" rail** | ✅ Complete | Auto-advancing, discount badges, strikethrough pricing |
| **Cart with quantity adjustment + floating basket** | ✅ Complete | Telegram MainButton/BackButton integration, haptic feedback |
| **Checkout stepper** (pickup/delivery toggle → address → fee → payment) | ✅ Complete | Single smooth flow with live fee recalculation |
| **Delivery address map picker** (Leaflet + OpenStreetMap) | ✅ Complete | Pin drag, click-to-place, Telegram LocationManager, Nominatim reverse-geocode |
| **Distance-based delivery fee engine** ([delivery-fee.js](file:///c:/Users/User/Downloads/order/packages/core/src/delivery-fee.js)) | ✅ Complete | Isolated, tested — Haversine fallback, zone inclusion/exclusion, admin-editable rules |
| **Saved addresses + delivery zones** | ✅ Complete | Multiple addresses per user, polygon + radius zones |
| **Order lifecycle state machine** ([order-lifecycle.js](file:///c:/Users/User/Downloads/order/packages/core/src/order-lifecycle.js)) | ✅ Complete | Tested — delivery & pickup paths, cancellable states |
| **Staff order board** (confirm → prepare → ready/out-for-delivery) | ✅ Complete | Rider assignment dropdown, status buttons |
| **Rider interface** (assigned deliveries, proof of delivery, location sharing) | ✅ Complete | Photo capture, customer name, camera input |
| **Live order tracking** (polling + rider location on map) | ✅ Complete | TrackingMap component, 8s polling interval |
| **Telegram bot notifications** on status transitions | ✅ Complete | `sendBotMessage` on every `publishOrderUpdate` |
| **Telebirr payment service** ([telebirr-service.js](file:///c:/Users/User/Downloads/order/apps/api/src/telebirr-service.js)) | ✅ Complete | RSA signing, webhook verification, sandbox mock mode, status polling |
| **Telebirr webhook + sandbox complete endpoint** | ✅ Complete | Signature verification, amount matching, raw payload logging |
| **Admin API** (products CRUD, delivery rules, zones, reports, CSV export) | ✅ Complete | Role-gated, promotion performance reports |
| **Promotion event tracking** (view/click analytics) | ✅ Complete | Anonymous ID support |
| **Supabase migrations** (3 files — PostGIS, RLS policies) | ✅ Complete | `telegram_user_id` claim-based RLS, Realtime publication |
| **Test suite** (7 test files — auth, delivery, lifecycle, flow) | ✅ Complete | Core + API test coverage |
| **Vercel deployment config** | ✅ Complete | Express-in-Pages-API pattern, single deployment |
| **Bilingual copy** (English + Amharic inline) | ⚠️ Partial | Customer storefront only, hardcoded in `App.jsx` (not a proper i18n system) |

### 🔴 Major Gaps vs. the Spec

| Gap | Spec Section | Severity |
|-----|-------------|----------|
| **No Admin Dashboard UI** — only API endpoints exist, no admin web interface | §3.6 | 🔴 Critical |
| **No Telebirr payment flow in the customer UI** — checkout hardcodes "Phase 4" cash-only messaging even though the API supports it | §3.5 | 🔴 Critical |
| **No i18n system** — strings are hardcoded in two inline `copy` objects, no runtime language switch, checkout/operations have English-only strings | §1, §4 | 🔴 High |
| **Telegram `themeParams` partial** — CSS vars set for bg/text/surface but many hardcoded colors (greens, earth tones) won't adapt to dark mode | §0, §5.1 | 🟡 Medium |
| **No order history screen** — API exists (`/api/orders/me`) but the customer UI has no way to access it | §3.1 | 🟡 Medium |
| **No Supabase production adapter** — repository is in-memory only (`createDevelopmentRepository`), never uses Supabase client | §5 | 🟡 Medium (works for development, blocks production) |
| **No Telebirr production credential swap** — config supports it but no documented switchover or env validation | §7 Phase 5 | 🟡 Medium |
| **No load testing or Phase 5 hardening** | §7 Phase 5 | 🟡 Medium |

---

## User Review Required

> [!IMPORTANT]
> **The codebase is significantly more complete than a blank project.** Phases 1–3 and the backend half of Phase 4 (Telebirr service) are built. The primary remaining work is:
> 1. Building the **Admin Dashboard web UI** (the biggest missing piece)
> 2. Wiring **Telebirr into the customer checkout flow**
> 3. Implementing a proper **i18n translation system**
> 4. Building a **customer order history** screen
> 5. Phase 5 production hardening

> [!WARNING]
> The repository currently stores **real Supabase service-role credentials** in [`.env.example`](file:///c:/Users/User/Downloads/order/.env.example) (line 12). These should be rotated immediately and replaced with placeholders. Service-role keys should never be committed, even in example files.

## Open Questions

1. **Scope for this session** — The spec is massive (5 phases). Should I focus on completing **Phase 4** (Telebirr UI + i18n + admin dashboard) since Phases 1–3 are essentially done? Or do you want me to tackle a specific subset?

2. **Admin Dashboard scope** — The spec calls for a full admin dashboard (§3.6) with product management, banner/promotion management, delivery rule editing, order management, rider management, and reports. Do you want the full dashboard in this round, or should I start with the most critical pieces (e.g., product + promotion management)?

3. **Supabase production adapter** — The codebase deliberately uses an in-memory repository for development. Do you want me to build a Supabase-backed `createSupabaseRepository()` in this round, or is that a later concern?

4. **Credentials** — Do you have Telebirr sandbox credentials ready (App ID, App Key, merchant code, RSA keys)? The mock mode will work without them, but testing the actual redirect flow requires real sandbox credentials.

5. **Brand assets** — Do you have a logo or specific brand colors? The current green palette (#174e30, #1d5b38) is pleasant but generic. If you have brand guidelines, I can use them during the UI/UX polish.

---

## Proposed Changes

Given that Phases 1–3 are built, I recommend completing the system in this order:

---

### Phase 4A — Customer Telebirr Payment Flow

Wire the existing Telebirr backend into the customer checkout UI so customers can actually choose Telebirr at checkout.

#### [MODIFY] [App.jsx](file:///c:/Users/User/Downloads/order/apps/web/src/App.jsx)
- Add a **payment method selector** (Cash / Telebirr toggle) in the `Checkout` component
- After order creation with `paymentMethod: 'telebirr'`, show the Telebirr checkout URL redirect (or sandbox mock button)
- Add a **payment status polling screen** that uses `api.paymentStatus()` and shows pending→paid transitions
- Replace the "Phase 4" placeholder text in the checkout

---

### Phase 4B — Complete i18n System

Replace the inline `copy` objects with a proper translation-key system.

#### [NEW] `apps/web/src/i18n.js`
- Create a translation module with full English + Amharic key sets covering all screens (storefront, checkout, operations, confirmation)
- `useLanguage()` hook that reads from Telegram's `language_code` and allows runtime switching
- Template interpolation support (e.g., `{count} items`)

#### [MODIFY] [App.jsx](file:///c:/Users/User/Downloads/order/apps/web/src/App.jsx)
- Replace all inline `copy` object references with `t()` calls from the i18n module
- Add language toggle button in the header
- Translate all hardcoded English strings in the checkout, confirmation, and empty states

#### [MODIFY] [OperationsApp.jsx](file:///c:/Users/User/Downloads/order/apps/web/src/OperationsApp.jsx)
- Apply the same i18n system to the staff/rider interfaces

---

### Phase 4C — Customer Order History

#### [MODIFY] [App.jsx](file:///c:/Users/User/Downloads/order/apps/web/src/App.jsx)
- Add an **order history** section accessible from the header or a tab
- List past orders with status, date, total, items summary
- Tap to view order detail with tracking (reuses the existing `Confirmation`/tracking logic)

---

### Phase 4D — Admin Dashboard UI

This is the largest missing piece. Build a complete admin web interface.

#### [NEW] `app/admin/page.jsx`
- Next.js App Router page for the admin dashboard

#### [NEW] `app/admin/admin-client.jsx`
- Client-side shell that dynamically imports the admin app

#### [NEW] `apps/web/src/AdminApp.jsx`
- Full admin dashboard with tabbed navigation:
  - **Products** — list, add, edit, delete products with inline forms
  - **Promotions** — banner CRUD, discount CRUD with start/end dates, image upload, priority ordering
  - **Orders** — filterable order list with status management and detail views
  - **Delivery** — delivery fee rule editor, delivery zone management with map visualization
  - **Riders** — rider list, assignment management
  - **Reports** — daily/weekly/monthly reports with summary cards, CSV export button, promotion performance table

#### [NEW] `apps/web/src/admin-api.js`
- Admin-specific API client wrapping the existing admin endpoints (`/api/admin/*`)
- Add any missing admin endpoints (e.g., promotion/banner CRUD if not yet present in the backend)

#### [MODIFY] [app.js](file:///c:/Users/User/Downloads/order/apps/api/src/app.js)
- Add admin banner/promotion CRUD endpoints (`POST/PATCH/DELETE /api/admin/promotions`)
- Add admin promotion event analytics endpoint if not sufficient

#### [MODIFY] [repository.js](file:///c:/Users/User/Downloads/order/apps/api/src/repository.js)
- Add `createBanner`, `updateBanner`, `deleteBanner` methods
- Add `listPromotionEvents` for the promotion performance report

---

### Phase 4E — UI/UX Polish Pass

#### [MODIFY] [styles.css](file:///c:/Users/User/Downloads/order/apps/web/src/styles.css)
- Improve dark mode support by using CSS variables throughout (not hardcoded hex values)
- Add admin dashboard styles
- Enhance Telegram `themeParams` integration for all color values
- Add micro-animation polish (button press, card hover, sheet transitions)
- Add proper loading skeletons instead of spinners

#### [MODIFY] [layout.jsx](file:///c:/Users/User/Downloads/order/app/layout.jsx)
- Add Google Fonts (Inter) via `<link>`
- Add Telegram Web App script tag

---

### Phase 5 — Production Readiness (documented but not code-heavy)

#### [MODIFY] [README.md](file:///c:/Users/User/Downloads/order/README.md)
- Add production deployment checklist
- Document Telebirr credential swap procedure
- Add load testing recommendations

#### [MODIFY] [.env.example](file:///c:/Users/User/Downloads/order/.env.example)
- Remove the actual Supabase credentials and replace with placeholders
- Add Telebirr environment variable placeholders

---

## Verification Plan

### Automated Tests
```bash
npm test
```
- Existing 7 test files continue passing
- New admin promotion CRUD tests
- Telebirr checkout flow integration test

### Manual Verification
1. Run `npm run dev` and open `http://localhost:3000`
2. Verify storefront loads with banners, deals, and catalog
3. Test full checkout flow with Telebirr (sandbox mock)
4. Open `/admin` and verify product CRUD, promotion management, delivery rule editing
5. Open `/operations?role=staff` and `/operations?role=rider` to verify staff/rider interfaces
6. Test language switching (EN ↔ AM) across all screens
7. Verify order history displays completed orders
