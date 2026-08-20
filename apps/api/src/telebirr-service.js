import { createSign, createVerify, randomBytes } from 'node:crypto';

function stableValue(value) {
  if (value === null || typeof value !== 'object') return String(value ?? '');
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}`;
}

export function canonicalTelebirrPayload(payload) {
  return Object.entries(payload || {})
    .filter(([key, value]) => !['sign', 'signature', 'sign_type'].includes(key) && value !== undefined && value !== null)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${stableValue(value)}`)
    .join('&');
}

function rsaSign(payload, privateKey) {
  const signer = createSign('RSA-SHA256');
  signer.update(canonicalTelebirrPayload(payload));
  signer.end();
  return signer.sign(privateKey, 'base64');
}

function rsaVerify(payload, signature, publicKey) {
  const verifier = createVerify('RSA-SHA256');
  verifier.update(canonicalTelebirrPayload(payload));
  verifier.end();
  return verifier.verify(publicKey, signature, 'base64');
}

function nested(result) {
  return result?.biz_content || result?.bizContent || result?.data || result || {};
}

function normaliseStatus(payload) {
  const raw = String(payload?.trade_status || payload?.tradeStatus || payload?.status || payload?.payment_status || '').toUpperCase();
  if (['SUCCESS', 'PAID', 'COMPLETED'].includes(raw)) return 'paid';
  if (['FAILED', 'CLOSED', 'CANCELLED', 'CANCELED'].includes(raw)) return 'failed';
  if (['REFUNDED', 'REFUND'].includes(raw)) return 'refunded';
  return 'pending';
}

function transactionId(payload) {
  return payload?.transaction_id || payload?.transactionId || payload?.trade_no || payload?.tradeNo || payload?.payment_id || null;
}

function merchantOrderId(payload) {
  return payload?.merch_order_id || payload?.merchOrderId || payload?.out_trade_no || payload?.order_id || null;
}

function numericAmount(payload) {
  const value = payload?.total_amount ?? payload?.totalAmount ?? payload?.amount;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function configured(settings) {
  return ['fabricAppId', 'appSecret', 'merchantAppId', 'merchantCode', 'privateKey', 'publicKey', 'notifyUrl', 'redirectUrl']
    .every((key) => Boolean(settings[key]));
}

export function createTelebirrService(settings = {}) {
  const active = configured(settings);
  const mock = Boolean(settings.useSandboxMock) && !active;
  let fabricToken = null;

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || body.errorMsg || `Telebirr request failed (${response.status}).`);
    return body;
  }

  async function token() {
    if (fabricToken?.expiresAt > Date.now() + 30_000) return fabricToken.value;
    const credentials = Buffer.from(`${settings.fabricAppId}:${settings.appSecret}`).toString('base64');
    const body = await requestJson(settings.tokenUrl, {
      method: 'POST',
      headers: { authorization: `Basic ${credentials}`, 'x-appid': settings.fabricAppId, 'content-type': 'application/json' },
      body: JSON.stringify({ appSecret: settings.appSecret })
    });
    const response = nested(body);
    const value = response.access_token || response.token || body.access_token || body.token;
    if (!value) throw new Error('Telebirr did not return a fabric token. Check the sandbox credentials and token endpoint.');
    fabricToken = { value, expiresAt: Date.now() + Math.max(60, Number(response.expires_in || body.expires_in || 600)) * 1000 };
    return value;
  }

  function signedPreOrder(payment) {
    const request = {
      appid: settings.merchantAppId,
      merch_code: settings.merchantCode,
      merch_order_id: payment.merchantOrderId,
      nonce_str: randomBytes(16).toString('hex'),
      timestamp: new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14),
      method: 'payment.preorder',
      version: '1.0',
      biz_content: {
        notify_url: settings.notifyUrl,
        redirect_url: settings.redirectUrl,
        title: `AllFreshMart ${payment.orderId}`.slice(0, 100),
        total_amount: Number(payment.amount).toFixed(2),
        merch_order_id: payment.merchantOrderId,
        trade_type: 'Checkout',
        business_type: 'BuyGoods',
        timeout_express: '120m'
      }
    };
    return { ...request, sign: rsaSign(request, settings.privateKey), sign_type: 'RSA256' };
  }

  return {
    configured: active,
    mock,
    async createCheckout(payment) {
      if (mock) return { checkoutUrl: null, providerReference: `sandbox-${payment.merchantOrderId}`, raw: { mode: 'sandbox_mock' }, mock: true };
      if (!active) throw new Error('Telebirr is not configured. Add sandbox credentials on the server or use cash payment.');
      const accessToken = await token();
      const request = signedPreOrder(payment);
      const response = await requestJson(settings.createOrderUrl, {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify(request)
      });
      const data = nested(response);
      const prepayId = data.prepay_id || data.prepayId;
      const checkoutUrl = data.toPayUrl || data.to_pay_url || data.payment_url || data.checkout_url;
      if (!checkoutUrl && !prepayId) throw new Error('Telebirr did not return a prepay ID or checkout URL.');
      const rawRequest = JSON.stringify({ ...request, prepay_id: prepayId });
      return {
        checkoutUrl: checkoutUrl || `${settings.checkoutBaseUrl}${encodeURIComponent(rawRequest)}`,
        providerReference: prepayId || null,
        raw: response,
        mock: false
      };
    },
    verifyNotification(payload) {
      if (mock) return { valid: payload?.sandbox === true, reason: 'Sandbox mock notification required.' };
      if (!active) return { valid: false, reason: 'Telebirr credentials are not configured.' };
      const signature = payload?.sign || payload?.signature;
      if (!signature) return { valid: false, reason: 'Telebirr notification has no signature.' };
      try { return { valid: rsaVerify(payload, signature, settings.publicKey) }; }
      catch { return { valid: false, reason: 'Telebirr notification signature is invalid.' }; }
    },
    interpretNotification(payload) {
      const data = nested(payload);
      return { merchantOrderId: merchantOrderId(data) || merchantOrderId(payload), status: normaliseStatus(data), transactionId: transactionId(data), amount: numericAmount(data) };
    },
    async query(payment) {
      if (mock) return { status: payment.status, transactionId: payment.transactionId || null, raw: { mode: 'sandbox_mock' } };
      if (!active) throw new Error('Telebirr is not configured.');
      const accessToken = await token();
      const request = {
        appid: settings.merchantAppId, merch_code: settings.merchantCode, merch_order_id: payment.merchantOrderId,
        nonce_str: randomBytes(16).toString('hex'), timestamp: new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14), method: 'payment.query', version: '1.0'
      };
      const response = await requestJson(settings.queryOrderUrl, {
        method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ ...request, sign: rsaSign(request, settings.privateKey), sign_type: 'RSA256' })
      });
      const data = nested(response);
      return { status: normaliseStatus(data), transactionId: transactionId(data), raw: response };
    }
  };
}
