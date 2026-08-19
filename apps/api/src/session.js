import crypto from 'node:crypto';

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function signSession({ telegramUserId, role }, secret, expiresInSeconds = 60 * 60 * 12) {
  const now = Math.floor(Date.now() / 1000);
  // `role` is reserved by Supabase/PostgREST for database roles. Application RBAC lives in `app_role`.
  const payload = { sub: String(telegramUserId), telegram_user_id: String(telegramUserId), role: 'authenticated', app_role: role, iat: now, exp: now + expiresInSeconds };
  const head = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode(payload);
  const signature = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${signature}`;
}

export function verifySession(token, secret) {
  if (!token) throw new Error('Missing session token');
  const [head, body, receivedSignature] = token.split('.');
  if (!head || !body || !receivedSignature) throw new Error('Malformed session token');
  const expectedSignature = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) throw new Error('Invalid session token');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) throw new Error('Session expired');
  return payload;
}
