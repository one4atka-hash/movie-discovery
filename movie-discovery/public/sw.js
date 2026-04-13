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

self.addEventListener('push', (event) => {
  let title = 'Movie Discovery';
  let body = '';
  try {
    if (event.data) {
      const j = event.data.json();
      if (j && typeof j === 'object') {
        if (typeof j.title === 'string') title = j.title;
        if (typeof j.body === 'string') body = j.body;
      }
    }
  } catch (_) {
    /* ignore */
  }
  event.waitUntil(self.registration.showNotification(title, { body }));
});
