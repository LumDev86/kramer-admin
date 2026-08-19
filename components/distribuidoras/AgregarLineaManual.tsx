'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { facturas } from '@/lib/api';

interface Props {
  facturaId: string;
  onAdded: () => void;
}

export default function AgregarLineaManual({ facturaId, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [cantidad, setCantidad] = useState('1');

  const addItemMutation = useMutation({
    mutationFn: (data: { nombreDetectado: string; cantidad: number; precioUnitario: number }) =>
      facturas.addItem(facturaId, data),
    onSuccess: () => {
      onAdded();
      setOpen(false);
      setNombre('');
      setPrecio('');
      setCantidad('1');
    },
  });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-semibold text-orange-500 hover:text-orange-600">
        + Agregar línea manual
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 bg-gray-50 rounded-xl p-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Descripción"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
        />
        <input
          type="number"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder="Cant."
          className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
        />
        <input
          type="number"
          step="0.01"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          placeholder="Precio"
          className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600"
        >
          Cancelar
        </button>
        <button
          onClick={() =>
            addItemMutation.mutate({
              nombreDetectado: nombre,
              cantidad: parseFloat(cantidad || '1'),
              precioUnitario: parseFloat(precio || '0'),
            })
          }
          disabled={!nombre.trim() || !precio}
          className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold disabled:opacity-50"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
