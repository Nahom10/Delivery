import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createDevelopmentRepository } from '../src/repository.js';
import { handleTelegramUpdate } from '../src/telegram-bot.js';

async function withServer(run) {
  const repository = createDevelopmentRepository({ bootstrapAdminTelegramId: '999' });
  const config = { webOrigin: 'http://localhost:5173', jwtSecret: 'test-secret', botToken: '', miniAppUrl: '', telegramWebhookSecret: '', isProduction: false };
  const server = createApp({ repository, config }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`, repository); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test('Phase 1 checkout computes the server price and blocks non-admin product access', async () => {
  await withServer(async (baseUrl) => {
    const sessionResponse = await fetch(`${baseUrl}/api/auth/development`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    const session = await sessionResponse.json();
    const forbidden = await fetch(`${baseUrl}/api/admin/products`, { headers: { authorization: `Bearer ${session.token}` } });
    assert.equal(forbidden.status, 403);
    const orderResponse = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ orderType: 'pickup', paymentMethod: 'cash', lines: [{ productId: 'tomatoes', quantity: 2 }] })
    });
    assert.equal(orderResponse.status, 201);
    assert.equal((await orderResponse.json()).order.total, 144);
  });
});

test('Bot accepts only a sender’s own shared contact', async () => {
  const repository = createDevelopmentRepository();
  const sender = { id: 12, first_name: 'Aster' };
  await handleTelegramUpdate({ message: { chat: { id: 12 }, from: sender, text: '/start' } }, { repository, botToken: '', miniAppUrl: '' });
  assert.equal(repository.getUser(12).phoneVerified, false);
  const mismatch = await handleTelegramUpdate({ message: { chat: { id: 12 }, from: sender, contact: { user_id: 99, phone_number: '+251911111111' } } }, { repository, botToken: '', miniAppUrl: '' });
  assert.equal(mismatch.reason, 'contact-user-mismatch');
  await handleTelegramUpdate({ message: { chat: { id: 12 }, from: sender, contact: { user_id: 12, phone_number: '+251922222222' } } }, { repository, botToken: '', miniAppUrl: '' });
  assert.equal(repository.getUser(12).phoneVerified, true);
});
