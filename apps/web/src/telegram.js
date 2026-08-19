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

export async function requestPreferredLocation() {
  const app = telegramApp();
  if (app?.LocationManager) {
    return new Promise((resolve, reject) => {
      app.LocationManager.init(() => {
        if (!app.LocationManager.isLocationAvailable) return reject(new Error('Location access is unavailable in this Telegram client.'));
        app.LocationManager.getLocation((location) => location ? resolve({ lat: location.latitude, lng: location.longitude }) : reject(new Error('Location access was not granted.')));
      });
    });
  }
  if (!navigator.geolocation) throw new Error('Location access is unavailable. Place the pin manually.');
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
    (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
    () => reject(new Error('Location access was not granted. Place the pin manually.')),
    { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
  ));
}
