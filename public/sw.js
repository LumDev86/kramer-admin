// este SW no cachea nada (no hace falta funcionar offline), así que no hay riesgo en activar
// cada actualización de inmediato en vez de esperar a que se cierren todas las pestañas viejas
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

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
      // el server manda este mismo push varias veces seguidas para un pedido nuevo (ver
      // pedido.service.ts) - sin renotify, el navegador solo actualiza el texto de la
      // notificación existente en silencio; con renotify, cada una vuelve a sonar/vibrar,
      // logrando el efecto de alarma persistente sin depender de audio propio de la página.
      renotify: true,
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
