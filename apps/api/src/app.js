import cors from 'cors';
import express from 'express';
import { signSession, verifySession } from './session.js';
import { verifyTelegramInitData } from './telegram-auth.js';
import { handleTelegramUpdate } from './telegram-bot.js';
import { createDeliveryService } from './delivery-service.js';
import { validCoordinates } from '@allfreshmart/core/src/delivery-fee.js';

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
    active: body.active !== false
  };
  if (!input.name || !input.categoryId || !input.unit || !input.imageUrl || !Number.isFinite(input.price) || input.price < 0 || !Number.isInteger(input.stock) || input.stock < 0) {
    throw new Error('A product needs name, category, unit, image, non-negative price, and whole-number stock');
  }
  return input;
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

export function createApp({ repository, config, deliveryService = createDeliveryService({ openRouteServiceKey: config.openRouteServiceKey }) }) {
  const app = express();
  app.use(cors({ origin: config.webOrigin, credentials: false }));
  app.use(express.json({ limit: '100kb' }));

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
  const quote = async (location, lines) => {
    const settings = repository.getDeliverySettings();
    const cart = repository.calculateCart(lines);
    const delivery = await deliveryService.quote({ origin: settings.origin, destination: location, subtotal: cart.subtotal, rules: settings.rules, zones: repository.getDeliveryZones() });
    return { cart, delivery };
  };

  app.get('/api/health', (_req, res) => res.json({ ok: true, phase: 1, storage: 'development-seeded' }));
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

  // Browser preview only. Never enabled in production and never accepts a chosen role.
  app.post('/api/auth/development', (req, res) => {
    if (config.isProduction) return res.status(404).end();
    const user = repository.upsertTelegramUser({ id: 'dev-customer', first_name: 'Demo', username: 'allfresh_demo', language_code: 'en' }, { phoneNumber: '+251900000000', phoneVerified: true });
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
      if (!['pickup', 'delivery'].includes(req.body?.orderType) || req.body?.paymentMethod !== 'cash') return res.status(422).json({ error: 'PAYMENT_NOT_AVAILABLE', message: 'Cash payment is currently available for pickup and delivery.' });
      let delivery = null;
      if (req.body.orderType === 'delivery') {
        const address = repository.getAddress(user.telegramUserId, req.body.addressId);
        if (!address) return res.status(422).json({ error: 'ADDRESS_REQUIRED', message: 'Choose a saved delivery address.' });
        const quoted = await quote(address, req.body.lines || []);
        if (!quoted.delivery.available) return res.status(422).json({ error: 'DELIVERY_UNAVAILABLE', message: quoted.delivery.reason });
        delivery = { address, quote: quoted.delivery };
      }
      const order = repository.createOrder({ telegramUserId: user.telegramUserId, lines: req.body.lines || [], note: req.body.note, orderType: req.body.orderType, delivery });
      res.status(201).json({ order });
    } catch (error) {
      res.status(422).json({ error: 'INVALID_ORDER', message: error.message });
    }
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

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Unexpected server error' });
  });
  return app;
}
