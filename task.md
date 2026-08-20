# AllFreshMart — Implementation Tasks

## Phase 4A — Customer Telebirr Payment Flow
- [ ] Add payment method selector (Cash / Telebirr) in Checkout
- [ ] Add Telebirr redirect/sandbox flow after order creation
- [ ] Add payment status polling screen
- [ ] Remove "Phase 4" placeholder text

## Phase 4B — Complete i18n System
- [ ] Create `apps/web/src/i18n.js` with full EN/AM translations
- [ ] Refactor `App.jsx` to use i18n module
- [ ] Add language toggle in header
- [ ] Apply i18n to OperationsApp.jsx

## Phase 4C — Customer Order History
- [ ] Add order history screen in App.jsx
- [ ] List past orders with status, date, total
- [ ] Tap to view order detail/tracking

## Phase 4D — Admin Dashboard UI
- [ ] Add admin banner/promotion CRUD API endpoints
- [ ] Add repository methods for banner management
- [ ] Create `app/admin/page.jsx` + client wrapper
- [ ] Create `AdminApp.jsx` with tabbed navigation
- [ ] Products tab — list, add, edit, delete
- [ ] Promotions tab — banner CRUD, discount management
- [ ] Orders tab — filterable list, status management
- [ ] Delivery tab — fee rules editor, zone management
- [ ] Riders tab — rider list
- [ ] Reports tab — summary cards, CSV export, promo performance

## Phase 4E — UI/UX Polish
- [ ] Fix dark mode with CSS variable coverage
- [ ] Add admin dashboard styles
- [ ] Add Google Fonts (Inter) to layout
- [ ] Add Telegram Web App script to layout

## Phase 5 — Production Readiness
- [ ] Sanitize `.env.example` (remove real Supabase credentials)
- [ ] Update README with production checklist
