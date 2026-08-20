import 'dotenv/config';

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
  allowLocalDevelopmentAuth: process.env.ALLOW_LOCAL_DEVELOPMENT_AUTH !== 'false' && !process.env.VERCEL
};
