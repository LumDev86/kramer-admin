// El aviso de "pedido nuevo" es 100% Web Push (ver lib/push.ts + public/sw.js): notificación
// nativa del sistema operativo, con su propio sonido, que llega aunque el navegador esté en
// otra pestaña o minimizado. No hay ningún audio propio de la página - se probó (Web Audio /
// Howler) y solo sonaba con la pestaña activa, por la política de autoplay del navegador.
export const requestNotificationPermission = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission().catch(() => {});
  }
};
