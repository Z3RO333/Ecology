// Minimal service worker — its presence with a fetch handler makes the
// tablet kiosk installable as a PWA on Chrome/Android. Network passthrough,
// no caching, so deploys are never served stale.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // No respondWith(): let the browser handle every request normally.
});
