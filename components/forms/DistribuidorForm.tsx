'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Distribuidor, distribuidores } from '@/lib/api';

interface Props {
  distribuidor?: Distribuidor;
}

export default function DistribuidorForm({ distribuidor }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const isEdit = !!distribuidor;

  const [nombre, setNombre] = useState(distribuidor?.nombre ?? '');
  const [telefono, setTelefono] = useState(distribuidor?.telefono ?? '');
  const [notas, setNotas] = useState(distribuidor?.notas ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        await distribuidores.update(distribuidor.id, { nombre, telefono: telefono || null, notas: notas || null });
      } else {
        await distribuidores.create({ nombre, ...(telefono && { telefono }), ...(notas && { notas }) });
      }
      qc.invalidateQueries({ queryKey: ['distribuidores'] });
      router.push('/distribuidoras');
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-5 max-w-lg">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">Nombre *</label>
        <input
          required
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de la distribuidora"
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">Teléfono</label>
        <input
          type="text"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="11-1234-5678"
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">Notas</label>
        <textarea
          rows={3}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Rubro, condiciones de pago, etc."
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium resize-none"
        />
      </div>

      {error && <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors disabled:opacity-60"
        >
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear'}
        </button>
      </div>
    </form>
  );
}
