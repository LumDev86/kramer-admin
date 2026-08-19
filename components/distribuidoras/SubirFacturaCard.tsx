'use client';

import { useRef } from 'react';
import { UploadSimple, Camera } from '@phosphor-icons/react';

interface Props {
  onUpload: (file: File) => void;
  uploading: boolean;
  error: string;
}

export default function SubirFacturaCard({ onUpload, uploading, error }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-700">Cargar una factura nueva</p>
          <p className="text-xs text-gray-400 mt-0.5">Sacale una foto y la IA va a leer los productos automáticamente</p>
          <p className="text-[11px] text-gray-400 mt-1">
            💡 Para que salga mejor: buena luz, la hoja derecha (no en ángulo) y acercate para que el texto se lea grande
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            <Camera size={16} weight="bold" />
            {uploading ? 'Leyendo factura...' : 'Sacar foto'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            <UploadSimple size={16} weight="bold" />
            Elegir archivo
          </button>
        </div>
      </div>
      {uploading && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 animate-fadeIn">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-xs text-orange-600 font-semibold">
            La IA está leyendo la factura, esto puede tardar unos segundos...
          </p>
        </div>
      )}
      {error && <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{error}</p>}
    </>
  );
}
