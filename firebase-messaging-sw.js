// Service Worker Push — Il Villaggio Caisse
// Uses standard Web Push API (no FCM dependency)

// Handle push events (background notifications)
self.addEventListener('push', event => {
  let data = { title: 'Nouvelle commande', body: '', url: '/caisse.html' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || '',
    icon: '/caisse-icon-192x192.png',
    badge: '/caisse-icon-192x192.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: 'new-order-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: { url: data.url || '/caisse.html' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Nouvelle commande', options)
  );
});

// Click on notification opens/focuses caisse
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/caisse.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes('caisse') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
