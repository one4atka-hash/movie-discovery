/**
 * Minimal service worker so the browser can create a Push subscription
 * (PushManager.subscribe). Actual push events can be handled here later.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
