'use client';

import { useState } from 'react';
import { products } from './api';
import { useToast } from '@/components/ui/Toast';

// Foto elegida en "Buscar foto con IA". Se baja por el server y entra a ImageUpload como una
// subida más (con "Quitar fondo"): pasarle `key={uploadKey}` e `initialFile={fotoBuscada}`.
// Si la web de origen no la deja bajar, queda `aiImageUrl` y se guarda por URL como antes
// (`imageSourceUrl` en el FormData), sin poder quitarle el fondo.
export function useFotoDeBusqueda(setImage: (file: File | null) => void) {
  const toast = useToast();
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [fotoBuscada, setFotoBuscada] = useState<File | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [bajandoFoto, setBajandoFoto] = useState<number | null>(null);

  const elegirFoto = async (imageUrl: string, indice: number) => {
    setBajandoFoto(indice);
    try {
      const file = await products.imageDownload(imageUrl);
      setFotoBuscada(file);
      setImage(file);
      setAiImageUrl(null);
      setUploadKey((k) => k + 1);
    } catch {
      setAiImageUrl(imageUrl);
      setFotoBuscada(null);
      setImage(null);
      toast.show('Esa web no dejó traer la foto: se usa igual, pero no se le puede quitar el fondo', 'error');
    } finally {
      setBajandoFoto(null);
    }
  };

  return { aiImageUrl, setAiImageUrl, fotoBuscada, uploadKey, bajandoFoto, elegirFoto };
}
