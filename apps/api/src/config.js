import 'dotenv/config';

const telebirrEnvironment = process.env.TELEBIRR_ENVIRONMENT || 'sandbox';
const telebirrGatewayBaseUrl = process.env.TELEBIRR_GATEWAY_BASE_URL
  || (telebirrEnvironment === 'production'
    ? 'https://superapp.ethiomobilemoney.et:38443/apiaccess/payment/gateway'
    : 'https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway');

export const config = {
  port: Number(process.env.PORT || 3001),
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:5173',
  botToken: process.env.BOT_TOKEN || '',
  miniAppUrl: process.env.MINI_APP_URL || '',
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
  openRouteServiceKey: process.env.OPENROUTESERVICE_API_KEY || '',
  jwtSecret: process.env.APP_JWT_SECRET || 'development-only-secret-change-me',
  bootstrapAdminTelegramId: process.env.BOOTSTRAP_ADMIN_TELEGRAM_ID || '',
  isProduction: process.env.NODE_ENV === 'production',
  // `next start` uses production mode even on a developer's own computer.
  // Keep the local preview usable without ever exposing demo sign-in on Vercel.
  allowLocalDevelopmentAuth: process.env.ALLOW_LOCAL_DEVELOPMENT_AUTH !== 'false' && !process.env.VERCEL,
  telebirr: {
    environment: telebirrEnvironment,
    fabricAppId: process.env.TELEBIRR_FABRIC_APP_ID || '',
    appSecret: process.env.TELEBIRR_APP_SECRET || '',
    merchantAppId: process.env.TELEBIRR_MERCHANT_APP_ID || '',
    merchantCode: process.env.TELEBIRR_MERCHANT_CODE || '',
    privateKey: process.env.TELEBIRR_PRIVATE_KEY || '',
    publicKey: process.env.TELEBIRR_PUBLIC_KEY || '',
    notifyUrl: process.env.TELEBIRR_NOTIFY_URL || '',
    redirectUrl: process.env.TELEBIRR_REDIRECT_URL || '',
    tokenUrl: process.env.TELEBIRR_TOKEN_URL || `${telebirrGatewayBaseUrl}/payment/v1/token`,
    createOrderUrl: process.env.TELEBIRR_CREATE_ORDER_URL || `${telebirrGatewayBaseUrl}/payment/v1/merchant/preOrder`,
    queryOrderUrl: process.env.TELEBIRR_QUERY_ORDER_URL || `${telebirrGatewayBaseUrl}/payment/v1/merchant/queryOrder`,
    checkoutBaseUrl: process.env.TELEBIRR_CHECKOUT_BASE_URL || `${telebirrGatewayBaseUrl}/payment/web/paygate?`,
    // Never enabled automatically for Vercel/production deployments.
    useSandboxMock: process.env.TELEBIRR_SANDBOX_MOCK === 'true' || (process.env.NODE_ENV !== 'production' && process.env.TELEBIRR_SANDBOX_MOCK !== 'false')
  }
};
