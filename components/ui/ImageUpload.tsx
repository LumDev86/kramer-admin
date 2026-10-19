'use client';

import { useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { UploadSimple, X, Eraser, SpinnerGap, CheckCircle } from '@phosphor-icons/react';
import { buttonClasses } from './Button';

interface Props {
  currentUrl?: string | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  withBgRemoval?: boolean;
  // compacta: foto chica con los botones al costado (formulario de producto).
  // Por defecto: recuadro grande para soltar la imagen (categorías, banners).
  compact?: boolean;
  // botones extra al lado de "Subir foto" (ej. "Buscar foto con IA"), solo en la compacta
  extraActions?: ReactNode;
  // foto que ya viene elegida (ej. de la búsqueda con IA): se muestra como si se hubiera subido.
  // Se lee solo al montar, así que para cambiarla el padre le cambia la `key`.
  initialFile?: File | null;
}

export default function ImageUpload({ currentUrl, onChange, required, withBgRemoval, compact, extraActions, initialFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(() => (initialFile ? URL.createObjectURL(initialFile) : null));
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile ?? null);
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
  const canRemoveBg = withBgRemoval && !!selectedFile && !removing && !bgRemoved;
  const abrir = () => !removing && inputRef.current?.click();

  const caja = (
    <div
      role="button"
      tabIndex={0}
      aria-label={displayUrl ? 'Cambiar la foto' : 'Elegir una foto'}
      onClick={abrir}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } }}
      className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-[1.5px] border-dashed border-[#B9AE97] bg-kr-sand transition-colors hover:border-kr-blue focus-visible:outline-2 focus-visible:outline-kr-blue ${
        compact ? 'h-24 w-24 sm:h-30 sm:w-30' : 'h-52 w-full'
      }`}
      style={{ backgroundImage: bgRemoved ? 'repeating-conic-gradient(#E2D6BF 0% 25%, white 0% 50%) 0 0 / 16px 16px' : undefined }}
    >
      {displayUrl ? (
        <>
          <Image src={displayUrl} alt="Foto elegida" fill sizes={compact ? '120px' : '600px'} className="object-contain p-2" unoptimized={bgRemoved} />
          {!removing && (
            <button
              type="button"
              aria-label="Quitar la foto"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-kr-navy bg-white hover:bg-[#FFE7D6]"
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </>
      ) : (
        <div className="pointer-events-none flex flex-col items-center gap-1.5 px-2 text-center text-kr-muted">
          <UploadSimple size={compact ? 26 : 30} weight="bold" />
          {!compact && (
            <>
              <p className="text-sm font-extrabold">Tocá para elegir una imagen</p>
              <p className="text-xs font-bold">JPG, PNG o WebP</p>
            </>
          )}
        </div>
      )}

      {removing && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-white/85 px-2 text-center">
          <SpinnerGap size={26} className="animate-spin text-kr-blue" />
          <p className="text-xs font-extrabold text-kr-navy">Quitando el fondo…</p>
        </div>
      )}
    </div>
  );

  const botonFondo = withBgRemoval && selectedFile && (
    <button
      type="button"
      onClick={handleRemoveBg}
      disabled={!canRemoveBg}
      className={buttonClasses('secondary', 'sm', bgRemoved ? '!border-kr-green-dark !text-kr-green-dark' : '')}
    >
      {bgRemoved ? <CheckCircle size={16} weight="fill" /> : <Eraser size={16} weight="bold" />}
      {bgRemoved ? 'Fondo quitado' : removing ? 'Quitando…' : 'Quitar fondo'}
    </button>
  );

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      required={required && !displayUrl}
      // el input está oculto: si falta la foto, el aviso del navegador no se ve; con sr-only sí
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
    />
  );

  if (compact) {
    return (
      <div className="flex items-center gap-3.5">
        {caja}
        <div className="flex min-w-0 flex-col items-start gap-2">
          <button type="button" onClick={abrir} className={buttonClasses('secondary', 'sm')}>
            <UploadSimple size={16} weight="bold" />
            {displayUrl ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {extraActions}
          {botonFondo}
        </div>
        {input}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {caja}
      {botonFondo}
      {input}
    </div>
  );
}
