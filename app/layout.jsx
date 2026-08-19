import 'leaflet/dist/leaflet.css';
import '../apps/web/src/styles.css';

export const metadata = {
  title: 'AllFreshMart',
  description: 'Fresh groceries in Telegram',
  themeColor: '#154f31',
  formatDetection: { telephone: false, date: false, email: false, address: false }
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
