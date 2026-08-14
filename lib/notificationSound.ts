// Sintetiza el sonido de alerta de "pedido nuevo" con Web Audio API en vez de cargar un
// archivo de audio — evita sumar un asset binario solo para un beep de dos tonos.
let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
};

const playTone = (ctx: AudioContext, frequency: number, startTime: number, duration: number) => {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
};

// El AudioContext arranca "suspended" hasta que hay un gesto real del usuario en la pestaña.
// El login ya cuenta como gesto, pero si se reabre una pestaña con la sesión ya guardada
// (sin volver a loguearse) puede no haber ningún click todavía - por eso layout.tsx llama a
// esto una sola vez ante el primer click/touch de la sesión, para no depender del login.
export const unlockAudio = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
};

// Si por algún motivo sigue suspendido al momento de sonar (política más estricta, o
// unlockAudio todavía no se disparó), resume() antes de sonar; si falla igual, no rompe el
// flujo, solo no suena esa vez.
export const playNewOrderSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const play = () => {
    const now = ctx.currentTime;
    playTone(ctx, 880, now, 0.18);
    playTone(ctx, 1318.5, now + 0.14, 0.22);
  };

  if (ctx.state === 'suspended') {
    ctx.resume().then(play).catch(() => {});
  } else {
    play();
  }
};
