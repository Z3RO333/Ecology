import type { MetadataRoute } from 'next';

// Web App Manifest — installable kiosk experience for the tablet.
// start_url/scope point at /tablet so launching from the home screen opens
// straight into the data-entry kiosk in standalone (no browser chrome).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EcoTracker — Registro de Reciclagem',
    short_name: 'EcoTracker',
    description: 'Registro de reciclagem por setor — modo quiosque',
    start_url: '/tablet',
    scope: '/tablet',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f0fdf4',
    theme_color: '#16a34a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
