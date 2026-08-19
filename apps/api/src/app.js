import cors from 'cors';
import express from 'express';
import { signSession, verifySession } from './session.js';
import { verifyTelegramInitData } from './telegram-auth.js';
import { handleTelegramUpdate } from './telegram-bot.js';

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

export function createApp({ repository, config }) {
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

  app.get('/api/health', (_req, res) => res.json({ ok: true, phase: 1, storage: 'development-seeded' }));
  app.get('/api/storefront', (_req, res) => res.json(repository.getStorefront()));

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
  app.post('/api/orders', requireSession, (req, res) => {
    try {
      const user = repository.getUser(req.session.telegram_user_id);
      if (!user?.phoneVerified) return res.status(422).json({ error: 'PHONE_REQUIRED', message: 'Share your Telegram contact with the bot before your first checkout.' });
      if (req.body?.orderType !== 'pickup' || req.body?.paymentMethod !== 'cash') {
        return res.status(422).json({ error: 'PHASE_ONE_ONLY', message: 'Phase 1 supports store pickup with cash payment only.' });
      }
      const order = repository.createPickupOrder({ telegramUserId: user.telegramUserId, lines: req.body.lines || [], note: req.body.note });
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

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Unexpected server error' });
  });
  return app;
}
