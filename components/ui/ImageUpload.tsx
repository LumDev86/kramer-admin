'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { UploadSimple, X, Eraser, SpinnerGap } from '@phosphor-icons/react';

interface Props {
  currentUrl?: string | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  withBgRemoval?: boolean;
}

export default function ImageUpload({ currentUrl, onChange, required, withBgRemoval }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removing, setRemoving] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);

  const handleFile = (file: File) => {
    setPreview(URL.createObjectURL(file));
    setSelectedFile(file);
    setBgRemoved(false);
    onChange(file);
  };

  const handleClear = () => {
    setPreview(null);
    setSelectedFile(null);
    setBgRemoved(false);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemoveBg = async () => {
    if (!selectedFile) return;
    setRemoving(true);
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const blob = await removeBackground(selectedFile);
      const file = new File([blob], 'product-nobg.png', { type: 'image/png' });
      setPreview(URL.createObjectURL(blob));
      setSelectedFile(file);
      setBgRemoved(true);
      onChange(file);
    } catch (err) {
      console.error('Error al eliminar fondo:', err);
    } finally {
      setRemoving(false);
    }
  };

  const displayUrl = preview ?? currentUrl;
  const canRemoveBg = withBgRemoval && !!selectedFile && !removing;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative w-full h-52 border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 cursor-pointer hover:border-orange-400 transition-colors flex items-center justify-center"
        style={{ backgroundImage: bgRemoved ? 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 16px 16px' : undefined }}
        onClick={() => !removing && inputRef.current?.click()}
      >
        {displayUrl ? (
          <>
            <Image src={displayUrl} alt="preview" fill className="object-contain p-2" unoptimized={bgRemoved} />
            {!removing && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center hover:bg-red-50 transition-colors z-10"
              >
                <X size={14} weight="bold" className="text-gray-500" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400 pointer-events-none">
            <UploadSimple size={28} />
            <p className="text-xs font-semibold">Clic para seleccionar imagen</p>
            <p className="text-xs">JPG, PNG, WebP</p>
          </div>
        )}

        {removing && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2 z-20">
            <SpinnerGap size={28} className="text-orange-500 animate-spin" />
            <p className="text-xs font-bold text-gray-600">Eliminando fondo...</p>
            <p className="text-xs text-gray-400">Puede tardar unos segundos</p>
          </div>
        )}
      </div>

      {withBgRemoval && (
        <button
          type="button"
          onClick={handleRemoveBg}
          disabled={!canRemoveBg}
          className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-colors ${
            bgRemoved
              ? 'border-green-200 bg-green-50 text-green-600'
              : canRemoveBg
              ? 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100'
              : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
          }`}
        >
          <Eraser size={14} weight="bold" />
          {bgRemoved ? '✓ Fondo eliminado' : 'Eliminar fondo'}
        </button>
      )}

      {withBgRemoval && !selectedFile && (
        <p className="text-xs text-gray-400 text-center">Seleccioná una imagen nueva para usar esta función</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required={required && !displayUrl}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}
