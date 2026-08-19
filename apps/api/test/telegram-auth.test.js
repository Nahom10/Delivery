import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyTelegramInitData } from '../src/telegram-auth.js';
import { signSession, verifySession } from '../src/session.js';

function signedInitData(values, token) {
  const check = Object.entries(values).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = crypto.createHmac('sha256', secret).update(check).digest('hex');
  return new URLSearchParams({ ...values, hash }).toString();
}

test('accepts correctly signed current Telegram init data', () => {
  const token = 'telegram-test-token';
  const data = signedInitData({ auth_date: String(Math.floor(Date.now() / 1000)), query_id: 'AAE', user: JSON.stringify({ id: 123, first_name: 'Aster' }) }, token);
  assert.equal(verifyTelegramInitData(data, token).id, 123);
});

test('rejects altered Telegram identity data', () => {
  const token = 'telegram-test-token';
  const data = signedInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 123 }) }, token).replace('123', '999');
  assert.throws(() => verifyTelegramInitData(data, token), /signature/);
});

test('session tokens retain telegram claim and reject a forged signature', () => {
  const token = signSession({ telegramUserId: '123', role: 'customer' }, 'secret');
  assert.equal(verifySession(token, 'secret').telegram_user_id, '123');
  assert.throws(() => verifySession(`${token}x`, 'secret'), /Invalid/);
});
