'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { clientes } from '@/lib/api';
import { CaretLeft, PencilSimple, Bell, Copy, Check, WhatsappLogo } from '@phosphor-icons/react';
import ConfirmModal from '@/components/ui/ConfirmModal';

const money = (value: number | string) =>
  `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// wa.me necesita el número con código de país sin signos; si ya viene con 54 lo dejamos,
// si no, asumimos Argentina (mercado de esta tienda) y se lo agregamos como mejor esfuerzo
const toWhatsappNumber = (telefono: string): string => {
  const digits = telefono.replace(/\D/g, '');
  return digits.startsWith('54') ? digits : `549${digits}`;
};

export default function ClienteDetallePage() {
  const { id } = useParams() as { id: string };
  const qc = useQueryClient();

  const [pagoAmount, setPagoAmount] = useState('');
  const [pagoNote, setPagoNote] = useState('');
  const [pagoError, setPagoError] = useState('');
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [recuperoUrl, setRecuperoUrl] = useState<string | null>(null);
  const [recuperoError, setRecuperoError] = useState('');
  const [copiedRecupero, setCopiedRecupero] = useState(false);

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientes.getById(id),
  });

  const pagoMutation = useMutation({
    mutationFn: (data: { amount: number; note?: string }) => clientes.registerPago(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cliente', id] });
      setPagoAmount('');
      setPagoNote('');
      setPagoError('');
    },
    onError: (err: any) => setPagoError(err.message ?? 'Error al registrar el abono'),
  });

  const toggleMutation = useMutation({
    mutationFn: () => clientes.toggleActive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cliente', id] });
      setConfirmToggle(false);
    },
  });

  const recuperoMutation = useMutation({
    mutationFn: () => clientes.generarRecupero(id),
    onSuccess: (data) => {
      setRecuperoUrl(data.url);
      setRecuperoError('');
      qc.invalidateQueries({ queryKey: ['cliente', id] });
      qc.invalidateQueries({ queryKey: ['clientes', 'reset-pendientes'] });
    },
    onError: (err: any) => setRecuperoError(err.message ?? 'Error al generar el link'),
  });

  const handlePago = () => {
    const amount = parseFloat(pagoAmount);
    if (!amount || amount <= 0) return;
    setPagoError('');
    pagoMutation.mutate({ amount, ...(pagoNote.trim() && { note: pagoNote.trim() }) });
  };

  const handleCopyRecupero = () => {
    if (!recuperoUrl) return;
    navigator.clipboard.writeText(recuperoUrl);
    setCopiedRecupero(true);
    setTimeout(() => setCopiedRecupero(false), 2000);
  };

  if (isLoading) {
    return <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />;
  }

  if (!cliente) {
    return <p className="text-sm text-gray-400 font-medium">Cliente no encontrado.</p>;
  }

  const deuda = cliente.deuda ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/clientes" className="text-gray-400 hover:text-gray-600 transition-colors">
          <CaretLeft size={20} weight="bold" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-gray-800">
            {cliente.nombre} {cliente.apellido}
            {cliente.apodo && <span className="text-gray-400 font-semibold text-lg"> ({cliente.apodo})</span>}
          </h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">
            {cliente.telefono ?? 'Sin teléfono'} · {cliente.direccion ?? 'Sin dirección'}
          </p>
        </div>
        <Link
          href={`/clientes/${id}/editar`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <PencilSimple size={15} weight="bold" />
          Editar
        </Link>
      </div>

      {cliente.passwordResetRequestedAt && !recuperoUrl && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-2">
            <Bell size={18} weight="fill" className="text-red-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-700">
              Este cliente pidió recuperar su contraseña el {formatDateTime(cliente.passwordResetRequestedAt)}
            </p>
          </div>
          <button
            onClick={() => recuperoMutation.mutate()}
            disabled={recuperoMutation.isPending}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            {recuperoMutation.isPending ? 'Generando...' : 'Generar link de recupero'}
          </button>
        </div>
      )}

      {recuperoError && (
        <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-xl px-4 py-2.5">{recuperoError}</p>
      )}

      {recuperoUrl && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-green-700">
            Link generado (válido por 24hs). Mandaselo al cliente para que elija su contraseña nueva:
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 bg-white border border-green-200 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-600 truncate">
              {recuperoUrl}
            </div>
            <button
              onClick={handleCopyRecupero}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0"
            >
              {copiedRecupero ? <Check size={15} weight="bold" className="text-green-600" /> : <Copy size={15} weight="bold" />}
              {copiedRecupero ? 'Copiado' : 'Copiar'}
            </button>
            {cliente.telefono && (
              <a
                href={`https://wa.me/${toWhatsappNumber(cliente.telefono)}?text=${encodeURIComponent(
                  `Hola ${cliente.nombre}! Para restablecer tu contraseña de Kiosco Kramer entrá a este link: ${recuperoUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#25D366] hover:opacity-90 text-white text-sm font-bold transition-opacity flex-shrink-0"
              >
                <WhatsappLogo size={16} weight="fill" />
                Enviar por WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Deuda actual</p>
          <p className={`text-2xl font-extrabold mt-1 ${deuda > 0 ? 'text-red-500' : 'text-gray-800'}`}>
            {money(deuda)}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Límite de crédito</p>
          <p className="text-2xl font-extrabold text-gray-800 mt-1">
            {cliente.creditLimit ? money(cliente.creditLimit) : 'Sin límite'}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col justify-between">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Estado</p>
          <div className="flex items-center justify-between mt-1">
            <p className={`text-lg font-extrabold ${cliente.isActive ? 'text-green-600' : 'text-gray-400'}`}>
              {cliente.isActive ? 'Activo' : 'Dado de baja'}
            </p>
            <button
              onClick={() => setConfirmToggle(true)}
              className="text-xs font-bold text-gray-500 hover:text-orange-500 transition-colors"
            >
              {cliente.isActive ? 'Dar de baja' : 'Reactivar'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
        <p className="text-sm font-bold text-gray-700">Registrar abono</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            min="0"
            step="0.01"
            value={pagoAmount}
            onChange={(e) => setPagoAmount(e.target.value)}
            placeholder="Monto"
            className="sm:w-40 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
          />
          <input
            type="text"
            value={pagoNote}
            onChange={(e) => setPagoNote(e.target.value)}
            placeholder="Nota (opcional)"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
          />
          <button
            onClick={handlePago}
            disabled={!pagoAmount || pagoMutation.isPending}
            className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            {pagoMutation.isPending ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
        {pagoError && (
          <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{pagoError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-700">Historial de compras a crédito</p>
          </div>
          <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
            {cliente.sales.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400 font-medium">
                Todavía no tiene compras a crédito.
              </p>
            ) : (
              cliente.sales.map((sale) => (
                <div key={sale.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-bold ${sale.status === 'CANCELLED' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {money(sale.total)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {sale.paidAt && formatDateTime(sale.paidAt)}
                    </p>
                  </div>
                  {sale.status === 'CANCELLED' && (
                    <p className="text-xs font-bold text-gray-400">Cancelado</p>
                  )}
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {sale.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between text-xs text-gray-500">
                        <span>{item.quantity} × {item.name}</span>
                        <span className="font-semibold text-gray-600">{money(item.subtotal)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-700">Historial de abonos</p>
          </div>
          <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
            {cliente.pagos.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400 font-medium">
                Todavía no registró ningún abono.
              </p>
            ) : (
              cliente.pagos.map((pago) => (
                <div key={pago.id} className="px-4 py-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-green-600">{money(pago.amount)}</p>
                    {pago.note && <p className="text-xs text-gray-400">{pago.note}</p>}
                  </div>
                  <p className="text-xs text-gray-400">{formatDateTime(pago.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {confirmToggle && (
        <ConfirmModal
          message={
            cliente.isActive
              ? '¿Dar de baja a este cliente? No se le va a poder cobrar un crédito nuevo hasta reactivarlo.'
              : '¿Reactivar a este cliente?'
          }
          loading={toggleMutation.isPending}
          onConfirm={() => toggleMutation.mutate()}
          onCancel={() => setConfirmToggle(false)}
        />
      )}
    </div>
  );
}
