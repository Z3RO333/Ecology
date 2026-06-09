'use client';

import { useEffect } from 'react';

// Version baked in at build time (git SHA). Compared against /api/version so the
// kiosk can reload itself after a deploy.
const CURRENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';
const VERSION_POLL_MS = 120_000;

// Registers the service worker (installable PWA), applies kiosk hardening
// (no long-press menu / text selection), and self-heals after deploys by
// reloading when a new build version is detected.
export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Non-fatal: the app still works online without the SW.
      });
    }

    const blockContextMenu = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', blockContextMenu);

    let timer: ReturnType<typeof setInterval> | undefined;
    if (CURRENT_VERSION !== 'dev') {
      timer = setInterval(async () => {
        try {
          const res = await fetch('/api/version', { cache: 'no-store' });
          const { version } = await res.json();
          // Reload to pick up the new deploy, but never while someone is typing.
          const active = document.activeElement?.tagName;
          const isTyping = active === 'INPUT' || active === 'TEXTAREA' || active === 'SELECT';
          if (version && version !== CURRENT_VERSION && !isTyping) {
            window.location.reload();
          }
        } catch {
          // Ignore transient network errors; try again next tick.
        }
      }, VERSION_POLL_MS);
    }

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu);
      if (timer) clearInterval(timer);
    };
  }, []);

  return null;
}
