import 'leaflet/dist/leaflet.css';
import '../apps/web/src/styles.css';

export const metadata = {
  title: 'AllFreshMart',
  description: 'Fresh groceries delivered in Telegram — order fruits, vegetables, and more.',
  themeColor: '#0d5f34',
  formatDetection: { telephone: false, date: false, email: false, address: false }
};

export default function RootLayout({ children }) {
  return <html lang="en">
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <script src="https://telegram.org/js/telegram-web-app.js" defer></script>
    </head>
    <body>{children}</body>
  </html>;
}
