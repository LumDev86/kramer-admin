import { push } from './api';

// el navegador espera la VAPID public key como Uint8Array, no como el string base64url que
// entrega el server/env
const urlBase64ToUint8Array = (base64String: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
};

// registra el Service Worker (si hace falta) y suscribe este navegador a Web Push, mandando
// la suscripción al server - así el aviso de "pedido nuevo" llega aunque esta pestaña esté en
// segundo plano o el navegador minimizado, sin depender de que el polling siga corriendo.
export const setupPushSubscription = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const { publicKey } = await push.getPublicKey();
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    await push.subscribe(subscription.toJSON());
  } catch (err) {
    // sin push real no se rompe nada - queda la alarma en pestaña activa como respaldo
    console.error('No se pudo suscribir a Web Push:', err);
  }
};
