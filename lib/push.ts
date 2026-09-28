// El aviso de "pedido nuevo" es solo el modal + sonido propio del panel
// (components/pedidos/PedidoNuevoAlerta.tsx) - se sacó el Web Push porque mostraba la
// notificación nativa de Windows, que el dueño no quiere. Esto limpia lo que haya quedado de
// antes en este navegador: da de baja la suscripción push (el server, si alguna vez vuelve a
// intentar mandarle algo, recibe 410 y la borra sola) y desregistra el Service Worker.
export const removePushSubscription = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      const subscription = await registration.pushManager?.getSubscription();
      if (subscription) await subscription.unsubscribe();
      await registration.unregister();
    }
  } catch (err) {
    console.error('No se pudo limpiar la suscripción push vieja:', err);
  }
};
