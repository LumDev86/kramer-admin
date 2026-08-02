'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { X } from '@phosphor-icons/react';

interface Props {
  imageUrl: string;
  alt?: string;
  onClose: () => void;
}

export default function ImageLightbox({ imageUrl, alt = 'Imagen ampliada', onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 animate-fadeIn"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <X size={20} weight="bold" />
      </button>
      <div className="relative w-full h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <Image src={imageUrl} alt={alt} fill sizes="90vw" className="object-contain" />
      </div>
    </div>
  );
}
