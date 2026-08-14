self.addEventListener('push', (event) => {
  let payload = { title: 'Pedido nuevo', body: '' };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    // si no vino como JSON, se usa el default de arriba
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Pedido nuevo', {
      body: payload.body || '',
      tag: 'kramer-pedido-nuevo',
      requireInteraction: true,
      data: payload.data || {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/pedidos');
    })
  );
});
