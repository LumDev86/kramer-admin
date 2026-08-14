import { Howl, Howler } from 'howler';

const SAMPLE_RATE = 44100;

// Sintetiza un WAV de dos tonos (ding-dong) con un silencio al final, para que Howler lo
// repita en loop y suene como una alarma constante - evita sumar un archivo de audio.
const synthesizeAlarmWavDataUri = (): string => {
  const totalDuration = 0.9; // por ciclo; Howler lo repite mientras isRinging
  const numSamples = Math.floor(SAMPLE_RATE * totalDuration);
  const samples = new Float32Array(numSamples);

  const addTone = (frequency: number, startTime: number, duration: number, peak = 0.5) => {
    const startSample = Math.floor(startTime * SAMPLE_RATE);
    const durationSamples = Math.floor(duration * SAMPLE_RATE);
    const attackSamples = Math.floor(0.01 * SAMPLE_RATE);
    for (let i = 0; i < durationSamples; i++) {
      const idx = startSample + i;
      if (idx >= numSamples) break;
      const t = i / SAMPLE_RATE;
      const envelope =
        i < attackSamples ? i / attackSamples : Math.exp((-4 * (i - attackSamples)) / (durationSamples - attackSamples || 1));
      samples[idx] += Math.sin(2 * Math.PI * frequency * t) * peak * envelope;
    }
  };

  // arpegio de tres notas ascendentes (C6-E6-G6), más "campanita" que un ding-dong de dos tonos
  addTone(1046.5, 0, 0.14);
  addTone(1318.5, 0.09, 0.14);
  addTone(1568, 0.18, 0.28);

  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, clamped * 0x7fff, true);
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
};

let alarmHowl: Howl | null = null;
let ringToken = 0;
// tope de seguridad: si nadie atiende, no queremos una alarma sonando para siempre
const RING_TIMEOUT_MS = 2 * 60 * 1000;

const getAlarmHowl = (): Howl | null => {
  if (typeof window === 'undefined') return null;
  if (!alarmHowl) alarmHowl = new Howl({ src: [synthesizeAlarmWavDataUri()], loop: true, volume: 0.7 });
  return alarmHowl;
};

// El audio arranca bloqueado hasta un gesto real del usuario. Howler ya intenta destrabar su
// contexto solo ante el primer touch/click de la página, pero por si la sesión venía guardada
// (pestaña reabierta sin loguearse de nuevo) layout.tsx llama esto también en el primer click.
export const unlockAudio = () => {
  getAlarmHowl();
  Howler.ctx?.resume?.().catch(() => {});
};

export const startAlarm = () => {
  const howl = getAlarmHowl();
  if (!howl) return;
  if (!howl.playing()) howl.play();

  const myToken = ++ringToken;
  setTimeout(() => {
    if (ringToken === myToken) stopAlarm();
  }, RING_TIMEOUT_MS);
};

export const stopAlarm = () => {
  ringToken++; // invalida cualquier timeout de auto-stop pendiente de un start() anterior
  alarmHowl?.stop();
};

export const isAlarmRinging = (): boolean => !!alarmHowl?.playing();

// Notificación de escritorio: aparece aunque el navegador no tenga el foco (otra ventana,
// minimizado) mientras la pestaña siga abierta - esto es lo que cubre "no estar mirando el panel".
export const requestNotificationPermission = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission().catch(() => {});
  }
};

export const notifyNewPedido = (numero: string, cliente: string) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification('Pedido nuevo', {
      body: `${numero} — ${cliente}`,
      tag: 'kramer-pedido-nuevo',
      requireInteraction: true, // no se cierra sola, queda hasta que la descarten
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Notification puede tirar en contextos no soportados/inseguros - no romper el flujo
  }
};
