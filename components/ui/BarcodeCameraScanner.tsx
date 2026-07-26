'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { X } from '@phosphor-icons/react';

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeCameraScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState('');

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | undefined;
    let handled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result, _err, ctrl) => {
        controls = ctrl;
        if (result && !handled) {
          handled = true;
          controls.stop();
          onDetectedRef.current(result.getText());
        }
      })
      .catch(() => setError('No se pudo acceder a la cámara'));

    return () => controls?.stop();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-w-sm animate-slideUp">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-700">Escanear con cámara</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} weight="bold" />
          </button>
        </div>
        {error ? (
          <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{error}</p>
        ) : (
          <video ref={videoRef} className="w-full rounded-xl bg-black aspect-square object-cover" muted />
        )}
        <p className="text-xs text-gray-400 mt-3 text-center">Apuntá la cámara al código de barras del producto</p>
      </div>
    </div>
  );
}
