import cors from 'cors';
import express from 'express';
import { signSession, verifySession } from './session.js';
import { verifyTelegramInitData } from './telegram-auth.js';
import { handleTelegramUpdate } from './telegram-bot.js';
import { sendBotMessage } from './telegram-bot.js';
import { createDeliveryService } from './delivery-service.js';
import { createTelebirrService } from './telebirr-service.js';
import { validCoordinates } from '@allfreshmart/core/src/delivery-fee.js';
import { displayStatus } from '@allfreshmart/core/src/order-lifecycle.js';

function publicUser(user) {
  return {
    telegramUserId: user.telegramUserId, username: user.username, firstName: user.firstName,
    lastName: user.lastName, languageCode: user.languageCode, phoneVerified: user.phoneVerified, role: user.role
  };
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function productInput(body) {
  const input = {
    name: String(body.name || '').trim(),
    categoryId: String(body.categoryId || '').trim(),
    description: String(body.description || '').trim(),
    price: numberOr(typeof body.price === 'object' ? body.price.original : body.price, NaN),
    stock: Math.trunc(numberOr(body.stock, NaN)),
    unit: String(body.unit || '').trim(),
    imageUrl: String(body.imageUrl || '').trim(),
    active: body.active !== false,
    discount: discountInput(body)
  };
  if (!input.name || !input.categoryId || !input.unit || !input.imageUrl || !Number.isFinite(input.price) || input.price < 0 || !Number.isInteger(input.stock) || input.stock < 0) {
    throw new Error('A product needs name, category, unit, image, non-negative price, and whole-number stock');
  }
  return input;
}

function discountInput(body) {
  const type = body.discountType;
  if (type === undefined || type === '') return body.discount ?? null;
  if (type === 'none') return null;
  if (!['percentage', 'fixed'].includes(type)) throw new Error('Discount type must be percentage, fixed, or none.');
  const value = Number(body.discountValue);
  if (!Number.isFinite(value) || value <= 0 || (type === 'percentage' && value > 100)) throw new Error('Discount value must be positive (a percentage at most 100).');
  const startsAt = body.discountStartsAt ? new Date(body.discountStartsAt).toISOString() : null;
  const endsAt = body.discountEndsAt ? new Date(body.discountEndsAt).toISOString() : null;
  if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) throw new Error('Discount end time must be after its start time.');
  return { active: body.discountActive !== false, kind: type, value, startsAt, endsAt };
}

function addressInput(body) {
  const lat = Number(body.lat); const lng = Number(body.lng);
  if (!validCoordinates({ lat, lng })) throw new Error('Select a valid delivery pin on the map.');
  const input = {
    label: String(body.label || 'Home').trim().slice(0, 40), lat, lng,
    houseNumber: String(body.houseNumber || '').trim().slice(0, 80),
    blockNumber: String(body.blockNumber || '').trim().slice(0, 80),
    street: String(body.street || '').trim().slice(0, 160),
    area: String(body.area || '').trim().slice(0, 160),
    landmark: String(body.landmark || '').trim().slice(0, 160),
    floorUnit: String(body.floorUnit || '').trim().slice(0, 80),
    deliveryNotes: String(body.deliveryNotes || '').trim().slice(0, 500),
    addressText: String(body.addressText || '').trim().slice(0, 500)
  };
  if (!input.label || (!input.street && !input.area && !input.landmark && !input.addressText)) {
    throw new Error('Add a street, area, landmark, or address description for the rider.');
  }
  return input;
}

function rulesInput(current, body) {
  const fields = ['baseFee', 'includedKm', 'perKmRate', 'freeDeliveryThreshold', 'freeDeliveryMaxKm', 'maxServiceKm'];
  const next = { ...current };
  for (const field of fields) if (body[field] !== undefined) next[field] = Number(body[field]);
  if (fields.some((field) => !Number.isFinite(next[field]) || next[field] < 0)) throw new Error('Delivery rule values must be non-negative numbers.');
  if (next.freeDeliveryMaxKm > next.maxServiceKm) throw new Error('Free-delivery distance cannot exceed the maximum service distance.');
  return next;
}

function zoneInput(body) {
  const input = { name: String(body.name || '').trim().slice(0, 100), kind: body.kind, type: body.type, active: body.active !== false };
  if (!input.name || !['inclusion', 'exclusion'].includes(input.kind) || !['radius', 'polygon'].includes(input.type)) throw new Error('Zone needs a name, inclusion/exclusion type, and radius/polygon geometry.');
  if (input.type === 'radius') {
    input.center = { lat: Number(body.center?.lat), lng: Number(body.center?.lng) }; input.radiusKm = Number(body.radiusKm);
    if (!validCoordinates(input.center) || !Number.isFinite(input.radiusKm) || input.radiusKm <= 0) throw new Error('Radius zones need valid coordinates and a positive radius.');
  } else {
    input.coordinates = body.coordinates;
    if (!Array.isArray(input.coordinates) || input.coordinates.length < 3 || input.coordinates.some((point) => !validCoordinates(point))) throw new Error('Polygon zones need at least three valid points.');
  }
  return input;
}

function proofInput(body) {
  const photoDataUrl = typeof body.photoDataUrl === 'string' ? body.photoDataUrl : '';
  const customerName = String(body.customerName || '').trim().slice(0, 100);
  if (photoDataUrl && (!photoDataUrl.startsWith('data:image/') || photoDataUrl.length > 4_500_000)) throw new Error('Proof photo must be an image smaller than 3 MB.');
  if (!photoDataUrl && !customerName) throw new Error('Capture a delivery photo or enter the customer confirmation name.');
  return { photoDataUrl: photoDataUrl || null, customerName: customerName || null };
}

function canManageStatus(order, role, actorId, nextStatus) {
  if (role === 'admin') return true;
  if (role === 'staff') return ['confirmed', 'preparing', 'ready_for_pickup', 'cancelled', 'refunded'].includes(nextStatus);
  return role === 'rider' && order.type === 'delivery' && order.assignedRiderId === String(actorId) && ['out_for_delivery', 'delivered'].includes(nextStatus);
}

function publicPayment(payment) {
  if (!payment) return null;
  const { providerRaw, ...safe } = payment;
  return safe;
}

function reportWindow(period = 'daily', now = new Date()) {
  const end = new Date(now);
  const start = new Date(now);
  if (period === 'monthly') start.setMonth(start.getMonth() - 1);
  else if (period === 'weekly') start.setDate(start.getDate() - 7);
  else start.setDate(start.getDate() - 1);
  return { start, end };
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function reportCsv(report) {
  const header = ['order_id', 'created_at', 'type', 'fulfillment_status', 'payment_method', 'payment_status', 'subtotal_etb', 'delivery_fee_etb', 'total_etb', 'promotion_id'];
  return [header, ...report.orders.map((order) => [order.id, order.createdAt, order.type, order.fulfillmentStatus, order.paymentMethod, order.paymentStatus, order.subtotal, order.deliveryFee, order.total, order.promotionId])]
    .map((row) => row.map(csvCell).join(',')).join('\n');
}

export function createApp({ repository, config, deliveryService = createDeliveryService({ openRouteServiceKey: config.openRouteServiceKey }), telebirrService = createTelebirrService(config.telebirr) }) {
  const app = express();
  app.use(cors({ origin: config.webOrigin, credentials: false }));
  app.use(express.json({ limit: '5mb', verify: (req, _res, buffer) => { req.rawBody = buffer.toString('utf8'); } }));

  const requireSession = (req, res, next) => {
    try {
      const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
      req.session = verifySession(token, config.jwtSecret);
      next();
    } catch (error) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: error.message });
    }
  };
  const requireAdmin = [requireSession, (req, res, next) => {
    if (req.session.app_role !== 'admin') return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin access is required' });
    next();
  }];
  const requireOperationsRole = [requireSession, (req, res, next) => {
    if (!['admin', 'staff', 'rider'].includes(req.session.app_role)) return res.status(403).json({ error: 'FORBIDDEN', message: 'Staff, rider, or admin access is required.' });
    next();
  }];
  const requireStaffRole = [requireSession, (req, res, next) => {
    if (!['admin', 'staff'].includes(req.session.app_role)) return res.status(403).json({ error: 'FORBIDDEN', message: 'Staff or admin access is required.' });
    next();
  }];
  const publishOrderUpdate = (order, notification = true) => {
    if (!notification) return;
    const text = `AllFreshMart order ${order.id}: ${displayStatus(order.fulfillmentStatus)}.`;
    sendBotMessage(config.botToken, order.telegramUserId, text).catch((error) => console.error(`Telegram notification failed for ${order.id}: ${error.message}`));
  };
  const quote = async (location, lines) => {
    const settings = repository.getDeliverySettings();
    const cart = repository.calculateCart(lines);
    const delivery = await deliveryService.quote({ origin: settings.origin, destination: location, subtotal: cart.subtotal, rules: settings.rules, zones: repository.getDeliveryZones() });
    return { cart, delivery };
  };

  app.get('/api/health', (_req, res) => res.json({ ok: true, phase: 4, storage: 'development-seeded', telebirr: telebirrService.configured ? 'sandbox-configured' : telebirrService.mock ? 'sandbox-mock' : 'not-configured' }));
  app.get('/', (_req, res) => res.json({ ok: true, service: 'AllFreshMart API', health: '/api/health' }));
  app.get('/api/storefront', (_req, res) => res.json(repository.getStorefront()));
  app.get('/api/delivery/config', (_req, res) => {
    const settings = repository.getDeliverySettings();
    res.json({ origin: settings.origin, rules: { currency: settings.rules.currency, maxServiceKm: settings.rules.maxServiceKm } });
  });
  app.post('/api/delivery/quote', async (req, res) => {
    try {
      const { cart, delivery } = await quote({ lat: req.body?.lat, lng: req.body?.lng }, req.body?.lines || []);
      res.json({ subtotal: cart.subtotal, quote: delivery });
    } catch (error) { res.status(422).json({ error: 'INVALID_DELIVERY_QUOTE', message: error.message }); }
  });
  app.post('/api/promotions/:id/events', (req, res) => {
    const banner = repository.getBanner(req.params.id);
    const type = String(req.body?.type || '');
    if (!banner || !['view', 'click'].includes(type)) return res.status(422).json({ error: 'INVALID_PROMOTION_EVENT' });
    repository.recordPromotionEvent({ promotionId: banner.id, type, anonymousId: req.body?.anonymousId });
    res.status(202).json({ ok: true });
  });
  app.post('/api/geocode/reverse', async (req, res) => {
    try { res.json(await deliveryService.reverseGeocode({ lat: req.body?.lat, lng: req.body?.lng })); }
    catch (error) { res.status(422).json({ error: 'REVERSE_GEOCODE_FAILED', message: error.message }); }
  });

  app.post('/api/auth/telegram', (req, res) => {
    try {
      const initData = req.body?.initData || req.get('x-telegram-init-data');
      const telegram = verifyTelegramInitData(initData, config.botToken);
      const user = repository.upsertTelegramUser(telegram);
      const token = signSession({ telegramUserId: user.telegramUserId, role: user.role }, config.jwtSecret);
      res.json({ token, user: publicUser(user) });
    } catch (error) {
      res.status(401).json({ error: 'TELEGRAM_AUTH_FAILED', message: error.message });
    }
  });

  const mayUseDevelopmentAuth = (req) => {
    if (!config.isProduction) return true;
    const host = String(req.hostname || '').toLowerCase();
    return config.allowLocalDevelopmentAuth && ['localhost', '127.0.0.1', '::1'].includes(host);
  };

  // Browser preview only. Vercel deployments always require Telegram authentication.
  app.post('/api/auth/development', (req, res) => {
    if (!mayUseDevelopmentAuth(req)) return res.status(404).end();
    const user = repository.upsertTelegramUser({ id: 'dev-customer', first_name: 'Demo', username: 'allfresh_demo', language_code: 'en' }, { phoneNumber: '+251900000000', phoneVerified: true });
    const token = signSession({ telegramUserId: user.telegramUserId, role: user.role }, config.jwtSecret);
    res.json({ token, user: publicUser(user), developmentOnly: true });
  });
  app.post('/api/auth/development/:role', (req, res) => {
    if (!mayUseDevelopmentAuth(req)) return res.status(404).end();
    if (!['admin', 'staff', 'rider'].includes(req.params.role)) return res.status(422).json({ error: 'INVALID_ROLE' });
    const user = repository.createDevelopmentRoleUser(req.params.role);
    const token = signSession({ telegramUserId: user.telegramUserId, role: user.role }, config.jwtSecret);
    res.json({ token, user: publicUser(user), developmentOnly: true });
  });

  app.post('/api/telegram/webhook', async (req, res, next) => {
    try {
      if (config.telegramWebhookSecret && req.get('x-telegram-bot-api-secret-token') !== config.telegramWebhookSecret) {
        return res.status(401).json({ error: 'INVALID_WEBHOOK_SECRET' });
      }
      const result = await handleTelegramUpdate(req.body, { repository, botToken: config.botToken, miniAppUrl: config.miniAppUrl });
      res.json({ ok: true, result });
    } catch (error) { next(error); }
  });

  app.get('/api/orders/me', requireSession, (req, res) => res.json({ orders: repository.listOrdersFor(req.session.telegram_user_id) }));
  app.get('/api/addresses', requireSession, (req, res) => res.json({ addresses: repository.listAddresses(req.session.telegram_user_id) }));
  app.post('/api/addresses', requireSession, (req, res) => {
    try { res.status(201).json({ address: repository.saveAddress(req.session.telegram_user_id, addressInput(req.body || {})) }); }
    catch (error) { res.status(422).json({ error: 'INVALID_ADDRESS', message: error.message }); }
  });
  app.post('/api/orders', requireSession, async (req, res) => {
    try {
      const user = repository.getUser(req.session.telegram_user_id);
      if (!user?.phoneVerified) return res.status(422).json({ error: 'PHONE_REQUIRED', message: 'Share your Telegram contact with the bot before your first checkout.' });
      const paymentMethod = req.body?.paymentMethod;
      if (!['pickup', 'delivery'].includes(req.body?.orderType) || !['cash', 'telebirr'].includes(paymentMethod)) return res.status(422).json({ error: 'PAYMENT_NOT_AVAILABLE', message: 'Choose cash or Telebirr for pickup or delivery.' });
      const promotionId = req.body?.promotionId ? String(req.body.promotionId) : null;
      if (promotionId && !repository.getBanner(promotionId)) return res.status(422).json({ error: 'INVALID_PROMOTION', message: 'The selected promotion is no longer available.' });
      let delivery = null;
      if (req.body.orderType === 'delivery') {
        const address = repository.getAddress(user.telegramUserId, req.body.addressId);
        if (!address) return res.status(422).json({ error: 'ADDRESS_REQUIRED', message: 'Choose a saved delivery address.' });
        const quoted = await quote(address, req.body.lines || []);
        if (!quoted.delivery.available) return res.status(422).json({ error: 'DELIVERY_UNAVAILABLE', message: quoted.delivery.reason });
        delivery = { address, quote: quoted.delivery };
      }
      const order = repository.createOrder({ telegramUserId: user.telegramUserId, lines: req.body.lines || [], note: req.body.note, orderType: req.body.orderType, delivery, paymentMethod, promotionId });
      let payment = null;
      if (paymentMethod === 'telebirr') {
        const merchantOrderId = `AFM${order.id.replace(/[^A-Za-z0-9]/g, '')}${Date.now().toString(36).toUpperCase()}`;
        const initial = { orderId: order.id, merchantOrderId, amount: order.total };
        const checkout = await telebirrService.createCheckout(initial);
        payment = repository.createPayment({ ...initial, provider: 'telebirr', checkoutUrl: checkout.checkoutUrl, providerReference: checkout.providerReference, raw: checkout.raw, sandboxMock: checkout.mock });
      }
      publishOrderUpdate(order);
      res.status(201).json({ order, payment: publicPayment(payment) });
    } catch (error) {
      res.status(422).json({ error: 'INVALID_ORDER', message: error.message });
    }
  });

  app.get('/api/orders/:id/payment', requireSession, async (req, res) => {
    try {
      const order = repository.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: 'NOT_FOUND' });
      if (order.telegramUserId !== req.session.telegram_user_id && req.session.app_role !== 'admin') return res.status(403).json({ error: 'FORBIDDEN' });
      let payment = repository.getPaymentForOrder(order.id);
      if (!payment) return res.status(404).json({ error: 'PAYMENT_NOT_FOUND' });
      if (payment.provider === 'telebirr' && payment.status === 'pending') {
        const checked = await telebirrService.query(payment);
        payment = repository.updatePayment(payment.id, { status: checked.status, transactionId: checked.transactionId || payment.transactionId, providerRaw: checked.raw });
      }
      res.json({ payment: publicPayment(payment), order: repository.getOrder(order.id) });
    } catch (error) { res.status(502).json({ error: 'PAYMENT_STATUS_CHECK_FAILED', message: error.message }); }
  });

  app.post('/api/payments/telebirr/notify', (req, res) => {
    const verified = telebirrService.verifyNotification(req.body || {});
    const interpreted = telebirrService.interpretNotification(req.body || {});
    const log = (outcome) => repository.logPaymentWebhook({ provider: 'telebirr', headers: { 'user-agent': req.get('user-agent') || '' }, payload: req.body || {}, rawBody: req.rawBody || '', signatureValid: verified.valid, outcome });
    if (!verified.valid) {
      log('rejected_signature');
      return res.status(401).json({ error: 'INVALID_PAYMENT_SIGNATURE', message: verified.reason || 'Telebirr signature validation failed.' });
    }
    if (!interpreted.merchantOrderId) { log('missing_merchant_order_id'); return res.status(422).json({ error: 'INVALID_PAYMENT_NOTIFICATION' }); }
    const payment = repository.getPaymentByMerchantOrderId(interpreted.merchantOrderId);
    if (!payment) { log('payment_not_found'); return res.status(404).json({ error: 'PAYMENT_NOT_FOUND' }); }
    if (interpreted.amount !== null && Math.abs(interpreted.amount - payment.amount) > 0.001) { log('amount_mismatch'); return res.status(422).json({ error: 'PAYMENT_AMOUNT_MISMATCH' }); }
    const updated = repository.updatePayment(payment.id, { status: interpreted.status, transactionId: interpreted.transactionId || payment.transactionId, providerRaw: req.body || {} });
    log(`updated_${updated.status}`);
    res.json({ ok: true, payment: publicPayment(updated) });
  });

  app.post('/api/payments/telebirr/sandbox/:id/complete', requireSession, (req, res) => {
    const payment = repository.getPayment(req.params.id);
    if (!telebirrService.mock) return res.status(404).end();
    if (!payment) return res.status(404).json({ error: 'PAYMENT_NOT_FOUND' });
    const order = repository.getOrder(payment.orderId);
    if (order.telegramUserId !== req.session.telegram_user_id) return res.status(403).json({ error: 'FORBIDDEN' });
    const updated = repository.updatePayment(payment.id, { status: 'paid', transactionId: `sandbox-${payment.merchantOrderId}`, providerRaw: { sandbox: true, completedAt: new Date().toISOString() } });
    repository.logPaymentWebhook({ provider: 'telebirr', payload: { sandbox: true, merchantOrderId: payment.merchantOrderId }, rawBody: '', signatureValid: true, outcome: 'sandbox_paid' });
    res.json({ payment: publicPayment(updated), order: repository.getOrder(order.id) });
  });

  app.get('/api/orders/:id/tracking', requireSession, (req, res) => {
    const order = repository.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'NOT_FOUND' });
    const isOwner = order.telegramUserId === req.session.telegram_user_id;
    const isAssignedRider = order.assignedRiderId === req.session.telegram_user_id;
    const isOperator = ['admin', 'staff'].includes(req.session.app_role);
    if (!isOwner && !isAssignedRider && !isOperator) return res.status(403).json({ error: 'FORBIDDEN' });
    const riderLocation = ['out_for_delivery', 'delivered', 'completed'].includes(order.fulfillmentStatus) && order.assignedRiderId
      ? repository.getRiderLocation(order.assignedRiderId) : null;
    res.json({ order, riderLocation });
  });

  app.get('/api/staff/orders', ...requireStaffRole, (_req, res) => res.json({ orders: repository.listAllOrders() }));
  app.get('/api/staff/riders', ...requireStaffRole, (_req, res) => res.json({ riders: repository.listRiders() }));
  app.post('/api/staff/orders/:id/assign-rider', ...requireStaffRole, (req, res) => {
    try {
      const order = repository.assignRider(req.params.id, req.body?.riderId, { id: req.session.telegram_user_id, role: req.session.app_role });
      res.json({ order });
    } catch (error) { res.status(422).json({ error: 'ASSIGNMENT_FAILED', message: error.message }); }
  });
  app.get('/api/rider/orders', ...requireOperationsRole, (req, res) => {
    if (req.session.app_role === 'rider') return res.json({ orders: repository.listOrdersForRider(req.session.telegram_user_id) });
    res.json({ orders: repository.listAllOrders().filter((order) => order.type === 'delivery') });
  });
  app.patch('/api/rider/location', ...requireOperationsRole, (req, res) => {
    try {
      if (req.session.app_role !== 'rider') return res.status(403).json({ error: 'FORBIDDEN', message: 'Only riders can publish a location.' });
      const location = { lat: Number(req.body?.lat), lng: Number(req.body?.lng) };
      if (!validCoordinates(location)) throw new Error('Choose a valid rider location.');
      res.json({ location: repository.updateRiderLocation(req.session.telegram_user_id, location) });
    } catch (error) { res.status(422).json({ error: 'INVALID_LOCATION', message: error.message }); }
  });
  app.post('/api/rider/orders/:id/proof', ...requireOperationsRole, (req, res) => {
    try {
      const order = repository.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: 'NOT_FOUND' });
      if (req.session.app_role !== 'rider' || order.assignedRiderId !== req.session.telegram_user_id) return res.status(403).json({ error: 'FORBIDDEN' });
      res.json({ order: repository.saveProofOfDelivery(req.params.id, proofInput(req.body || {}), { id: req.session.telegram_user_id, role: 'rider' }) });
    } catch (error) { res.status(422).json({ error: 'PROOF_FAILED', message: error.message }); }
  });
  app.patch('/api/orders/:id/status', ...requireOperationsRole, (req, res) => {
    try {
      const order = repository.getOrder(req.params.id);
      const nextStatus = String(req.body?.status || '');
      if (!order) return res.status(404).json({ error: 'NOT_FOUND' });
      if (!canManageStatus(order, req.session.app_role, req.session.telegram_user_id, nextStatus)) return res.status(403).json({ error: 'FORBIDDEN', message: 'This role cannot make that status change.' });
      if (nextStatus === 'delivered' && !order.proofOfDelivery) return res.status(422).json({ error: 'PROOF_REQUIRED', message: 'Capture proof of delivery before marking the order delivered.' });
      const updated = repository.updateOrderStatus(req.params.id, nextStatus, { id: req.session.telegram_user_id, role: req.session.app_role });
      publishOrderUpdate(updated);
      res.json({ order: updated });
    } catch (error) { res.status(422).json({ error: 'INVALID_STATUS_TRANSITION', message: error.message }); }
  });

  app.get('/api/admin/products', ...requireAdmin, (_req, res) => res.json({ products: repository.getProducts() }));
  app.post('/api/admin/products', ...requireAdmin, (req, res) => {
    try { res.status(201).json({ product: repository.createProduct(productInput(req.body || {})) }); }
    catch (error) { res.status(422).json({ error: 'INVALID_PRODUCT', message: error.message }); }
  });
  app.patch('/api/admin/products/:id', ...requireAdmin, (req, res) => {
    try {
      const current = repository.getProducts().find((product) => product.id === req.params.id);
      if (!current) return res.status(404).json({ error: 'NOT_FOUND' });
      const product = repository.updateProduct(req.params.id, productInput({ ...current, ...req.body }));
      res.json({ product });
    } catch (error) { res.status(422).json({ error: 'INVALID_PRODUCT', message: error.message }); }
  });
  app.delete('/api/admin/products/:id', ...requireAdmin, (req, res) => {
    const product = repository.updateProduct(req.params.id, { active: false });
    if (!product) return res.status(404).json({ error: 'NOT_FOUND' });
    res.status(204).end();
  });
  app.get('/api/admin/orders', ...requireAdmin, (_req, res) => res.json({ orders: repository.listAllOrders() }));
  app.get('/api/admin/reports', ...requireAdmin, (req, res) => {
    const period = ['daily', 'weekly', 'monthly'].includes(req.query.period) ? req.query.period : 'daily';
    const window = reportWindow(period);
    res.json({ period, ...repository.report({ from: window.start, to: window.end }) });
  });
  app.get('/api/admin/reports.csv', ...requireAdmin, (req, res) => {
    const period = ['daily', 'weekly', 'monthly'].includes(req.query.period) ? req.query.period : 'daily';
    const window = reportWindow(period);
    res.type('text/csv').attachment(`allfreshmart-${period}-report.csv`).send(reportCsv(repository.report({ from: window.start, to: window.end })));
  });
  app.get('/api/admin/delivery/rules', ...requireAdmin, (_req, res) => res.json(repository.getDeliverySettings()));
  app.patch('/api/admin/delivery/rules', ...requireAdmin, (req, res) => {
    try { res.json({ rules: repository.updateDeliveryRules(rulesInput(repository.getDeliverySettings().rules, req.body || {})) }); }
    catch (error) { res.status(422).json({ error: 'INVALID_DELIVERY_RULES', message: error.message }); }
  });
  app.get('/api/admin/delivery/zones', ...requireAdmin, (_req, res) => res.json({ zones: repository.getDeliveryZones() }));
  app.post('/api/admin/delivery/zones', ...requireAdmin, (req, res) => {
    try { res.status(201).json({ zone: repository.createDeliveryZone(zoneInput(req.body || {})) }); }
    catch (error) { res.status(422).json({ error: 'INVALID_ZONE', message: error.message }); }
  });
  app.patch('/api/admin/delivery/zones/:id', ...requireAdmin, (req, res) => {
    try {
      const zone = repository.updateDeliveryZone(req.params.id, zoneInput({ ...req.body, id: undefined }));
      if (!zone) return res.status(404).json({ error: 'NOT_FOUND' });
      res.json({ zone });
    } catch (error) { res.status(422).json({ error: 'INVALID_ZONE', message: error.message }); }
  });

  // ─── Admin Promotions/Banners ───
  app.get('/api/admin/promotions', ...requireAdmin, (_req, res) => res.json({ promotions: repository.getAllBanners() }));
  app.post('/api/admin/promotions', ...requireAdmin, (req, res) => {
    try {
      const body = req.body || {};
      const input = {
        title: String(body.title || '').trim().slice(0, 200),
        subtitle: String(body.subtitle || '').trim().slice(0, 300),
        imageUrl: String(body.imageUrl || '').trim(),
        targetType: String(body.targetType || 'sale'),
        targetId: body.targetId ? String(body.targetId).trim() : null,
        priority: Math.trunc(numberOr(body.priority, 0)),
        startsAt: body.startsAt || new Date().toISOString(),
        endsAt: body.endsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        active: body.active !== false
      };
      if (!input.title || !input.imageUrl || !['product', 'category', 'sale'].includes(input.targetType)) {
        throw new Error('A promotion needs a title, image URL, and a valid target type (product, category, or sale).');
      }
      res.status(201).json({ promotion: repository.createBanner(input) });
    } catch (error) { res.status(422).json({ error: 'INVALID_PROMOTION', message: error.message }); }
  });
  app.patch('/api/admin/promotions/:id', ...requireAdmin, (req, res) => {
    try {
      const current = repository.getBanner(req.params.id);
      if (!current) return res.status(404).json({ error: 'NOT_FOUND' });
      const body = req.body || {};
      const changes = {};
      if (body.title !== undefined) changes.title = String(body.title).trim().slice(0, 200);
      if (body.subtitle !== undefined) changes.subtitle = String(body.subtitle).trim().slice(0, 300);
      if (body.imageUrl !== undefined) changes.imageUrl = String(body.imageUrl).trim();
      if (body.targetType !== undefined) changes.targetType = String(body.targetType);
      if (body.targetId !== undefined) changes.targetId = body.targetId ? String(body.targetId).trim() : null;
      if (body.priority !== undefined) changes.priority = Math.trunc(numberOr(body.priority, current.priority));
      if (body.startsAt !== undefined) changes.startsAt = body.startsAt;
      if (body.endsAt !== undefined) changes.endsAt = body.endsAt;
      if (body.active !== undefined) changes.active = Boolean(body.active);
      res.json({ promotion: repository.updateBanner(req.params.id, changes) });
    } catch (error) { res.status(422).json({ error: 'INVALID_PROMOTION', message: error.message }); }
  });
  app.delete('/api/admin/promotions/:id', ...requireAdmin, (req, res) => {
    const result = repository.updateBanner(req.params.id, { active: false });
    if (!result) return res.status(404).json({ error: 'NOT_FOUND' });
    res.status(204).end();
  });

  // ─── Admin Users ───
  app.get('/api/admin/users', ...requireAdmin, (_req, res) => res.json({ users: repository.listUsers() }));
  app.patch('/api/admin/users/:id/role', ...requireAdmin, (req, res) => {
    try {
      const role = String(req.body?.role || '');
      if (!['customer', 'admin', 'staff', 'rider'].includes(role)) return res.status(422).json({ error: 'INVALID_ROLE' });
      const user = repository.updateUserRole(req.params.id, role);
      if (!user) return res.status(404).json({ error: 'NOT_FOUND' });
      res.json({ user: publicUser(user) });
    } catch (error) { res.status(422).json({ error: 'UPDATE_FAILED', message: error.message }); }
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Unexpected server error' });
  });
  return app;
}
