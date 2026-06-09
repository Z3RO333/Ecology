'use client';

import { useEffect } from 'react';

// Registers the service worker (installable PWA) and applies kiosk hardening
// so the tablet stops feeling like a browser: no long-press menu, no text
// selection, no pull-to-refresh / overscroll bounce.
export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Non-fatal: the app still works online without the SW.
      });
    }

    const blockContextMenu = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', blockContextMenu);

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu);
    };
  }, []);

  return null;
}
