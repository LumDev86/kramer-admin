'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sales, SaleWithCliente, PaymentMethod } from '@/lib/api';
import { CaretLeft, CaretRight, X, WhatsappLogo, Trash } from '@phosphor-icons/react';
import ConfirmModal from './ConfirmModal';

const money = (value: number | string) =>
  `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CREDIT: 'Crédito',
};

const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// no hay un folio secuencial real en el modelo (ver ventas-pos-feature) - se usa el final
// del id, más corto y legible para identificar el ticket a simple vista
const folioOf = (id: string) => id.slice(-8).toUpperCase();

const horaOf = (sale: SaleWithCliente) =>
  new Date(sale.paidAt ?? sale.cancelledAt ?? sale.openedAt).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

// wa.me necesita el número con código de país sin signos; mismo criterio que el resto del admin
const toWhatsappNumber = (telefono: string): string => {
  const digits = telefono.replace(/\D/g, '');
  return digits.startsWith('54') ? digits : `549${digits}`;
};

const waLink = (telefono: string, mensaje: string) =>
  `https://wa.me/${toWhatsappNumber(telefono)}?text=${encodeURIComponent(mensaje)}`;

const buildTicketMessage = (sale: SaleWithCliente): string => {
  const fecha = new Date(sale.paidAt ?? sale.cancelledAt ?? sale.openedAt).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const lineas = sale.items.map((item) => `${item.quantity} x ${item.name} — ${money(item.subtotal)}`).join('\n');
  return `Hola! Te compartimos el ticket de tu compra en Kiosco Kramer 🛒\nTicket ${folioOf(sale.id)} · ${fecha}\n\n${lineas}\n\nTotal: ${money(sale.total)}`;
};

interface Props {
  currentSessionId: string | null;
  onClose: () => void;
}

export default function VentasDelDiaModal({ currentSessionId, onClose }: Props) {
  const qc = useQueryClient();
  const [fecha, setFecha] = useState(() => new Date());
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [toCancel, setToCancel] = useState<SaleWithCliente | null>(null);
  const [toRemoveItem, setToRemoveItem] = useState<{ sale: SaleWithCliente; itemId: string } | null>(null);
  const [actionError, setActionError] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['sales', 'by-date', toISODate(fecha)],
    queryFn: () => sales.getByDate(toISODate(fecha)),
  });

  const ventas = data ?? [];
  const selected = ventas.find((s) => s.id === selectedSaleId) ?? null;

  useEffect(() => {
    setSelectedSaleId(null);
    setSelectedItemId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toISODate(fecha)]);

  useEffect(() => {
    if (!selectedSaleId && ventas.length > 0) setSelectedSaleId(ventas[0].id);
  }, [ventas, selectedSaleId]);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['sales'] });
    qc.invalidateQueries({ queryKey: ['cash-session'] });
  };

  const cancelMutation = useMutation({
    mutationFn: (saleId: string) => sales.cancel(saleId),
    onSuccess: () => {
      invalidateAll();
      setToCancel(null);
      setActionError('');
    },
    onError: (err: any) => setActionError(err.message ?? 'Error al cancelar el ticket'),
  });

  const removeItemMutation = useMutation({
    mutationFn: ({ saleId, itemId }: { saleId: string; itemId: string }) => sales.removeItem(saleId, itemId),
    onSuccess: () => {
      invalidateAll();
      setToRemoveItem(null);
      setSelectedItemId(null);
      setActionError('');
    },
    onError: (err: any) => setActionError(err.message ?? 'Error al quitar el producto'),
  });

  const editable = !!selected && selected.status === 'PAID' && selected.cashSessionId === currentSessionId;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-fadeIn" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col animate-slideUp overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-extrabold text-gray-800">Ventas del día</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Lista de tickets del día */}
          <div className="w-[380px] flex-shrink-0 border-r border-gray-100 flex flex-col min-h-0">
            <div className="grid grid-cols-[1fr_44px_64px_84px] gap-2 px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100 flex-shrink-0">
              <span>Folio</span>
              <span className="text-right">Arts</span>
              <span className="text-right">Hora</span>
              <span className="text-right">Total</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {isFetching ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400 font-medium">Cargando...</p>
              ) : ventas.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400 font-medium">Sin ventas ese día.</p>
              ) : (
                ventas.map((sale) => {
                  const arts = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                  const cancelled = sale.status === 'CANCELLED';
                  return (
                    <button
                      key={sale.id}
                      onClick={() => { setSelectedSaleId(sale.id); setSelectedItemId(null); }}
                      className={`w-full grid grid-cols-[1fr_44px_64px_84px] gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                        selected?.id === sale.id ? 'bg-orange-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className={`font-bold ${cancelled ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                        {folioOf(sale.id)}
                      </span>
                      <span className={`text-right ${cancelled ? 'text-gray-300' : 'text-gray-500'}`}>{arts}</span>
                      <span className={`text-right ${cancelled ? 'text-gray-300' : 'text-gray-500'}`}>{horaOf(sale)}</span>
                      <span className={`text-right font-bold ${cancelled ? 'text-gray-300' : 'text-orange-500'}`}>
                        {money(sale.total)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setFecha((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
              >
                <CaretLeft size={14} weight="bold" />
              </button>
              <p className="text-xs font-bold text-gray-700 text-center capitalize">
                {fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFecha((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                >
                  <CaretRight size={14} weight="bold" />
                </button>
                <button
                  onClick={() => setFecha(new Date())}
                  className="text-xs font-bold text-orange-500 hover:text-orange-600 ml-1"
                >
                  Hoy
                </button>
              </div>
            </div>
          </div>

          {/* Detalle del ticket seleccionado */}
          <div className="flex-1 flex flex-col min-h-0">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400 font-medium">
                Elegí un ticket para ver el detalle.
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-extrabold text-gray-800">Ticket {folioOf(selected.id)}</p>
                    {selected.status === 'CANCELLED' && (
                      <span className="text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg">Cancelado</span>
                    )}
                  </div>
                  {selected.cliente && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      Cliente: <span className="font-semibold text-gray-700">{selected.cliente.nombre} {selected.cliente.apellido}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(selected.paidAt ?? selected.cancelledAt ?? selected.openedAt).toLocaleString('es-AR', {
                      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                        <th className="pb-2 w-14">Cant.</th>
                        <th className="pb-2">Descripción</th>
                        <th className="pb-2 text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selected.items.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedItemId(item.id)}
                          className={`cursor-pointer transition-colors ${
                            selectedItemId === item.id ? 'bg-orange-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="py-2 font-semibold text-gray-600">{item.quantity}</td>
                          <td className="py-2 text-gray-700">{item.name}</td>
                          <td className="py-2 text-right font-semibold text-gray-600">{money(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 flex flex-col gap-3">
                  {actionError && (
                    <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{actionError}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total</p>
                      <p className="text-xl font-extrabold text-gray-800">{money(selected.total)}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-500">
                      Pago con: {selected.paymentMethod ? PAYMENT_METHOD_LABELS[selected.paymentMethod] : '—'}
                    </p>
                  </div>

                  {selected.customerPhone && (
                    <a
                      href={waLink(selected.customerPhone, buildTicketMessage(selected))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 text-green-700 text-sm font-bold hover:bg-green-100 transition-colors"
                    >
                      <WhatsappLogo size={16} weight="fill" />
                      Enviar ticket por WhatsApp
                    </a>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => selected && selectedItemId && setToRemoveItem({ sale: selected, itemId: selectedItemId })}
                      disabled={!editable || !selectedItemId}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                    >
                      <Trash size={14} weight="bold" />
                      Devolver artículo
                    </button>
                    <button
                      onClick={() => selected && setToCancel(selected)}
                      disabled={!editable}
                      className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-40"
                    >
                      Cancelar venta
                    </button>
                  </div>
                  {selected.status === 'PAID' && selected.cashSessionId !== currentSessionId && (
                    <p className="text-[11px] text-gray-400 text-center">
                      El turno de caja de este ticket ya está cerrado — no se puede modificar.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>

    {toCancel && (
      <ConfirmModal
        message="¿Cancelar este ticket ya cobrado? Se repondrá el stock de sus productos y dejará de contar en las ventas del turno."
        error={actionError}
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate(toCancel.id)}
        onCancel={() => { setToCancel(null); setActionError(''); }}
      />
    )}

    {toRemoveItem && (
      <ConfirmModal
        message="¿Quitar este producto del ticket? Se repondrá su stock y se descontará del total cobrado."
        error={actionError}
        loading={removeItemMutation.isPending}
        onConfirm={() => removeItemMutation.mutate({ saleId: toRemoveItem.sale.id, itemId: toRemoveItem.itemId })}
        onCancel={() => { setToRemoveItem(null); setActionError(''); }}
      />
    )}
    </>
  );
}
