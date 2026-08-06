'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Cliente, clientes } from '@/lib/api';

interface Props {
  cliente?: Cliente;
}

export default function ClienteForm({ cliente }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const isEdit = !!cliente;

  const [nombre, setNombre] = useState(cliente?.nombre ?? '');
  const [apellido, setApellido] = useState(cliente?.apellido ?? '');
  const [apodo, setApodo] = useState(cliente?.apodo ?? '');
  const [dni, setDni] = useState(cliente?.dni ?? '');
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '');
  const [direccion, setDireccion] = useState(cliente?.direccion ?? '');
  const [email, setEmail] = useState(cliente?.email ?? '');
  const [creditLimit, setCreditLimit] = useState(cliente?.creditLimit ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        await clientes.update(cliente.id, {
          nombre,
          apellido,
          apodo: apodo || null,
          dni: dni || null,
          telefono: telefono || null,
          direccion: direccion || null,
          email: email || null,
          creditLimit: creditLimit !== '' ? parseFloat(String(creditLimit)) : null,
        });
      } else {
        await clientes.create({
          nombre,
          apellido,
          ...(apodo && { apodo }),
          ...(dni && { dni }),
          ...(telefono && { telefono }),
          ...(direccion && { direccion }),
          ...(email && { email }),
          ...(creditLimit !== '' && { creditLimit: parseFloat(String(creditLimit)) }),
        });
      }
      qc.invalidateQueries({ queryKey: ['clientes'] });
      router.push('/clientes');
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-5 max-w-lg">
      <div className="flex gap-4">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Nombre *</label>
          <input
            required
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
          />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Apellido *</label>
          <input
            required
            type="text"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            placeholder="Apellido"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Apodo</label>
          <input
            type="text"
            value={apodo}
            onChange={(e) => setApodo(e.target.value)}
            placeholder="Como le dicen habitualmente"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
          />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">DNI</label>
          <input
            type="text"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="30123456"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Teléfono</label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="11-1234-5678"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
          />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@ejemplo.com"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">Dirección</label>
        <input
          type="text"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          placeholder="Domicilio"
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
        />
      </div>

      <p className="text-xs text-gray-400 -mt-2">
        El cliente ahora puede registrarse solo desde la tienda online para ver su cuenta. Cargarlo acá a mano es
        para el caso puntual de alguien que no puede autoregistrarse — no le da acceso al portal (no tiene
        contraseña) hasta que se registre él mismo con este email.
      </p>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">Límite de crédito</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          placeholder="Dejalo vacío si no querés poner un tope"
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
        />
        <p className="text-xs text-gray-400">
          Si lo completás, el sistema no va a dejar cobrarle un crédito que supere este monto de deuda.
        </p>
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
