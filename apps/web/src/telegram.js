export function telegramApp() {
  return window.Telegram?.WebApp;
}

export function initialiseTelegramTheme() {
  const app = telegramApp();
  if (!app) return null;
  app.ready();
  app.expand();
  const theme = app.themeParams || {};
  const root = document.documentElement;
  if (theme.bg_color) root.style.setProperty('--tg-bg', theme.bg_color);
  if (theme.text_color) root.style.setProperty('--tg-text', theme.text_color);
  if (theme.secondary_bg_color) root.style.setProperty('--tg-surface', theme.secondary_bg_color);
  return app;
}

export function haptic(type = 'impact', style = 'light') {
  const feedback = telegramApp()?.HapticFeedback;
  if (!feedback) return;
  if (type === 'notification') feedback.notificationOccurred(style);
  else feedback.impactOccurred(style);
}
