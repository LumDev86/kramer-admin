'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sales, SaleWithCliente, PaymentMethod } from '@/lib/api';
import { CaretLeft, CaretRight, X, Trash } from '@phosphor-icons/react';
import ConfirmModal from './ConfirmModal';
import Chip from './Chip';
import { buttonClasses } from './Button';
import { money } from '@/lib/format';

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
  // en el celular no entran los dos paneles: se ve la lista o el detalle
  const [showDetail, setShowDetail] = useState(false);

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

  const moverFecha = (dias: number) =>
    setFecha((d) => { const n = new Date(d); n.setDate(n.getDate() + dias); return n; });

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-kr-navy/50 sm:items-center sm:px-4 animate-fadeIn" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ventas del día"
        className="bg-white w-full max-w-4xl h-full sm:h-[85vh] sm:rounded-2xl sm:border-2 sm:border-kr-navy sm:shadow-pop-lg flex flex-col animate-slideUp overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2 sm:px-5 border-b border-kr-line flex-shrink-0">
          {/* celular: con un ticket abierto, la flecha vuelve a la lista */}
          {showDetail && (
            <button
              type="button"
              onClick={() => setShowDetail(false)}
              aria-label="Volver a la lista"
              className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl text-kr-navy hover:bg-kr-sand"
            >
              <CaretLeft size={20} weight="bold" />
            </button>
          )}
          <h2 className="font-display text-2xl leading-none flex-1">Ventas del día</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-kr-muted hover:bg-kr-sand hover:text-kr-navy transition-colors"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Lista de tickets del día */}
          <div className={`w-full md:w-[380px] flex-shrink-0 md:border-r border-kr-line flex-col min-h-0 ${showDetail ? 'hidden md:flex' : 'flex'}`}>
            {/* el header vive DENTRO del contenedor con scroll (sticky, no fixed afuera) para
                que sufra el mismo recorte de ancho que las filas cuando aparece la scrollbar -
                separados en dos contenedores, la lista pierde ~15px de ancho al scrollear pero
                el header (afuera) no, y las columnas quedan desalineadas entre sí */}
            <div className="flex-1 overflow-y-auto">
              <div className="sticky top-0 z-10 grid grid-cols-[72px_1fr_40px_76px_92px] gap-x-2 px-4 py-2 text-xs font-extrabold text-kr-muted uppercase tracking-wide border-b border-kr-line bg-kr-paper">
                <span>Folio</span>
                <span />
                <span className="text-right">Arts</span>
                <span>Hora</span>
                <span className="text-right">Total</span>
              </div>
              {isFetching ? (
                <p className="px-4 py-8 text-center text-sm text-kr-muted font-bold">Cargando...</p>
              ) : ventas.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-kr-muted font-bold">Sin ventas ese día.</p>
              ) : (
                <div className="divide-y divide-dashed divide-kr-line">
                {ventas.map((sale) => {
                  const arts = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                  const cancelled = sale.status === 'CANCELLED';
                  const credito = sale.paymentMethod === 'CREDIT';
                  return (
                    <button
                      type="button"
                      key={sale.id}
                      onClick={() => { setSelectedSaleId(sale.id); setSelectedItemId(null); setShowDetail(true); }}
                      className={`w-full grid grid-cols-[72px_1fr_40px_76px_92px] gap-x-2 items-center px-4 min-h-12 py-2 text-left text-sm transition-colors ${
                        selected?.id === sale.id
                          ? 'bg-kr-yellow-soft shadow-[inset_4px_0_0_#F26B1D]'
                          // fiado/crédito es la excepción (la mayoría cobra en el momento) - se
                          // marca toda la fila porque, a diferencia del resto de las ventas,
                          // esta plata todavía no entró a la caja
                          : credito && !cancelled
                          ? 'bg-kr-blue-soft hover:bg-[#DCE8F8]'
                          : 'hover:bg-kr-paper'
                      }`}
                    >
                      <span className={`font-mono text-[11px] ${cancelled ? 'line-through text-kr-muted/50' : 'text-kr-muted'}`}>
                        {folioOf(sale.id)}
                      </span>
                      <span>
                        {credito && !cancelled && <span className="text-[11px] font-extrabold text-kr-blue">Crédito</span>}
                        {cancelled && <span className="text-[11px] font-extrabold text-kr-orange-dark">Cancelado</span>}
                      </span>
                      <span className={`text-right font-bold tabular-nums ${cancelled ? 'text-kr-muted/50' : 'text-kr-muted'}`}>{arts}</span>
                      {/* alineada a la izquierda, no a la derecha como Arts/Total - el label
                          "Hora" es mucho más corto que un valor tipo "12:14 a. m.", así que
                          alinear a la derecha dejaba el valor mucho más corrido hacia la
                          izquierda que el label, aunque el borde derecho coincidiera */}
                      <span className={`whitespace-nowrap font-bold ${cancelled ? 'text-kr-muted/50' : 'text-kr-muted'}`}>{horaOf(sale)}</span>
                      <span className={`text-right font-extrabold tabular-nums whitespace-nowrap ${cancelled ? 'text-kr-muted/50 line-through' : 'text-kr-navy'}`}>
                        {money(sale.total)}
                      </span>
                    </button>
                  );
                })}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-kr-line bg-kr-paper flex-shrink-0">
              <button
                type="button"
                onClick={() => moverFecha(-1)}
                aria-label="Día anterior"
                className="w-10 h-10 rounded-[10px] border-[1.5px] border-kr-line bg-white flex items-center justify-center text-kr-navy hover:border-kr-navy/40"
              >
                <CaretLeft size={16} weight="bold" />
              </button>
              <p className="text-sm font-extrabold text-kr-navy text-center capitalize">
                {fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => moverFecha(1)}
                  aria-label="Día siguiente"
                  className="w-10 h-10 rounded-[10px] border-[1.5px] border-kr-line bg-white flex items-center justify-center text-kr-navy hover:border-kr-navy/40"
                >
                  <CaretRight size={16} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => setFecha(new Date())}
                  className="min-h-10 px-3 rounded-[10px] border-[1.5px] border-kr-line bg-white text-[13px] font-extrabold text-kr-navy hover:border-kr-navy/40"
                >
                  Hoy
                </button>
              </div>
            </div>
          </div>

          {/* Detalle del ticket seleccionado */}
          <div className={`flex-1 flex-col min-h-0 min-w-0 ${showDetail ? 'flex' : 'hidden md:flex'}`}>
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-sm text-kr-muted font-bold">
                Elegí un ticket para ver el detalle.
              </div>
            ) : (
              <>
                <div className="px-4 sm:px-5 py-3 border-b border-kr-line flex-shrink-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-xl leading-tight mr-auto">Ticket {folioOf(selected.id)}</p>
                    {selected.status === 'CANCELLED' && <Chip tone="bad">Cancelado</Chip>}
                    {selected.paymentMethod === 'CREDIT' && selected.status !== 'CANCELLED' && <Chip tone="info">Crédito</Chip>}
                  </div>
                  {selected.cliente && (
                    <p className="text-sm font-bold text-kr-muted mt-0.5">
                      Cliente: <span className="font-extrabold text-kr-navy">{selected.cliente.nombre} {selected.cliente.apellido}</span>
                    </p>
                  )}
                  <p className="text-xs font-bold text-kr-muted mt-0.5">
                    {new Date(selected.paidAt ?? selected.cancelledAt ?? selected.openedAt).toLocaleString('es-AR', {
                      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] gap-x-3 px-4 sm:px-5 py-2 text-xs font-extrabold text-kr-muted uppercase tracking-wide border-b border-kr-line bg-kr-paper sticky top-0">
                    <span className="text-right">Cant.</span>
                    <span>Descripción</span>
                    <span className="text-right">Importe</span>
                  </div>
                  <ul className="divide-y divide-dashed divide-kr-line">
                    {selected.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedItemId(item.id)}
                          aria-pressed={selectedItemId === item.id}
                          className={`w-full grid grid-cols-[48px_minmax(0,1fr)_auto] gap-x-3 items-center px-4 sm:px-5 py-2.5 min-h-11 text-left text-sm transition-colors ${
                            selectedItemId === item.id ? 'bg-kr-yellow-soft shadow-[inset_4px_0_0_#F26B1D]' : 'hover:bg-kr-paper'
                          }`}
                        >
                          <span className="text-right font-extrabold tabular-nums">{item.quantity}</span>
                          <span className="font-bold leading-snug break-words">{item.name}</span>
                          <span className="text-right font-extrabold tabular-nums whitespace-nowrap">{money(item.subtotal)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="px-4 sm:px-5 py-3 border-t border-kr-line flex-shrink-0 flex flex-col gap-3">
                  {actionError && (
                    <p role="alert" className="text-sm text-kr-orange-dark font-bold bg-[#FFE7D6] rounded-xl px-3 py-2">{actionError}</p>
                  )}
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold text-kr-muted uppercase tracking-wide">Total</p>
                      <p className="font-display text-3xl leading-none tabular-nums">{money(selected.total)}</p>
                    </div>
                    <p className="text-sm font-bold text-kr-muted">
                      Pagó con: <span className="font-extrabold text-kr-navy">{selected.paymentMethod ? PAYMENT_METHOD_LABELS[selected.paymentMethod] : '—'}</span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => selected && selectedItemId && setToRemoveItem({ sale: selected, itemId: selectedItemId })}
                      disabled={!editable || !selectedItemId}
                      title={editable && !selectedItemId ? 'Tocá un producto de la lista para elegirlo' : undefined}
                      className={buttonClasses('secondary', 'md', 'flex-1')}
                    >
                      <Trash size={16} weight="bold" />
                      Devolver artículo
                    </button>
                    <button
                      type="button"
                      onClick={() => selected && setToCancel(selected)}
                      disabled={!editable}
                      className={buttonClasses('danger', 'md', 'flex-1')}
                    >
                      Cancelar venta
                    </button>
                  </div>
                  {selected.status === 'PAID' && selected.cashSessionId !== currentSessionId && (
                    <p className="text-xs font-bold text-kr-muted text-center">
                      El turno de caja de este ticket ya está cerrado: no se puede modificar.
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
        confirmLabel="Cancelar venta"
        error={actionError}
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate(toCancel.id)}
        onCancel={() => { setToCancel(null); setActionError(''); }}
      />
    )}

    {toRemoveItem && (
      <ConfirmModal
        message="¿Quitar este producto del ticket? Se repondrá su stock y se descontará del total cobrado."
        confirmLabel="Devolver artículo"
        error={actionError}
        loading={removeItemMutation.isPending}
        onConfirm={() => removeItemMutation.mutate({ saleId: toRemoveItem.sale.id, itemId: toRemoveItem.itemId })}
        onCancel={() => { setToRemoveItem(null); setActionError(''); }}
      />
    )}
    </>
  );
}
