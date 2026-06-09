import type { Metadata, Viewport } from 'next';
import { PWARegister } from '@/components/tablet/PWARegister';

export const metadata: Metadata = {
  title: 'EcoTracker — Registro',
  // iOS "Add to Home Screen": launch standalone with the right title/icon.
  appleWebApp: {
    capable: true,
    title: 'EcoTracker',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#16a34a',
  // Kiosk: stop pinch-zoom so taps stay predictable on the tablet.
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function TabletLayout({ children }: { children: React.ReactNode }) {
  return (
    // Kiosk wrapper: no text selection, no tap highlight, no pull-to-refresh
    // bounce — keeps the surface feeling like a native operational app.
    <div className="select-none [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent] [overscroll-behavior:none] [touch-action:manipulation]">
      <PWARegister />
      {children}
    </div>
  );
}
