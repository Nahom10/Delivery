import crypto from 'node:crypto';

export function verifyTelegramInitData(initData, botToken, maxAgeSeconds = 24 * 60 * 60) {
  if (!botToken) throw new Error('Telegram authentication is not configured');
  if (!initData) throw new Error('Missing Telegram init data');
  const params = new URLSearchParams(initData);
  const suppliedHash = params.get('hash');
  if (!suppliedHash) throw new Error('Missing Telegram init-data hash');
  params.delete('hash');

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || (Date.now() / 1000) - authDate > maxAgeSeconds) throw new Error('Telegram init data has expired');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  const supplied = Buffer.from(suppliedHash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) throw new Error('Invalid Telegram init-data signature');

  const userRaw = params.get('user');
  if (!userRaw) throw new Error('Telegram init data does not contain a user');
  const user = JSON.parse(userRaw);
  if (!user.id) throw new Error('Telegram user ID is missing');
  return user;
}
