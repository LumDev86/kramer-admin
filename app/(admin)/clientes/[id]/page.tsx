'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowDownLeft, Bell, Check, Copy, Key, ShoppingBag, WhatsappLogo } from '@phosphor-icons/react';
import { clientes, ClientePago, Sale } from '@/lib/api';
import { money, formatDateTime, waLink } from '@/lib/format';
import ConfirmModal from '@/components/ui/ConfirmModal';
import PageHeader from '@/components/ui/PageHeader';
import Card, { CardTitle } from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import Segmented from '@/components/ui/Segmented';
import Field, { inputClasses } from '@/components/ui/Field';
import StickyActionBar from '@/components/ui/StickyActionBar';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import BarraLimite from '@/components/clientes/BarraLimite';

type FiltroMov = 'todo' | 'compras' | 'abonos';
type Movimiento = { tipo: 'compra'; fecha: string; sale: Sale } | { tipo: 'abono'; fecha: string; pago: ClientePago };

export default function ClienteDetallePage() {
  const { id } = useParams() as { id: string };
  const qc = useQueryClient();
  const toast = useToast();
  const montoRef = useRef<HTMLInputElement>(null);

  const [pagoAmount, setPagoAmount] = useState('');
  const [pagoNote, setPagoNote] = useState('');
  const [pagoError, setPagoError] = useState('');
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [recuperoUrl, setRecuperoUrl] = useState<string | null>(null);
  const [copiedRecupero, setCopiedRecupero] = useState(false);
  const [filtro, setFiltro] = useState<FiltroMov>('todo');

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientes.getById(id),
  });

  const pagoMutation = useMutation({
    mutationFn: (data: { amount: number; note?: string }) => clientes.registerPago(id, data),
    onSuccess: (_p, data) => {
      qc.invalidateQueries({ queryKey: ['cliente', id] });
      qc.invalidateQueries({ queryKey: ['clientes'] });
      toast.show(`Abono de ${money(data.amount)} registrado`);
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
      qc.invalidateQueries({ queryKey: ['clientes'] });
      setConfirmToggle(false);
    },
    onError: (err: any) => toast.show(err.message ?? 'No se pudo cambiar el estado', 'error'),
  });

  const recuperoMutation = useMutation({
    mutationFn: () => clientes.generarRecupero(id),
    onSuccess: (data) => {
      setRecuperoUrl(data.url);
      qc.invalidateQueries({ queryKey: ['cliente', id] });
      qc.invalidateQueries({ queryKey: ['clientes', 'reset-pendientes'] });
    },
    onError: (err: any) => toast.show(err.message ?? 'Error al generar el link', 'error'),
  });

  const handlePago = (e?: React.FormEvent) => {
    e?.preventDefault();
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

  // celular: el botón fijo de abajo lleva al formulario de abono
  const irAlAbono = () => {
    montoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => montoRef.current?.focus(), 300);
  };

  if (isLoading) {
    return (
      <>
        <div className="h-16 w-72 animate-pulse rounded-2xl bg-white" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <div className="h-80 animate-pulse rounded-2xl bg-white" />
          <div className="h-96 animate-pulse rounded-2xl bg-white" />
        </div>
      </>
    );
  }

  if (!cliente) {
    return (
      <p className="rounded-2xl border border-kr-line bg-white px-4 py-10 text-center text-sm font-bold text-kr-muted">
        Cliente no encontrado. <Link href="/clientes" className="text-kr-blue underline">Volver</Link>
      </p>
    );
  }

  const deuda = cliente.deuda ?? 0;

  const movimientos: Movimiento[] = [
    ...cliente.sales.map((sale): Movimiento => ({ tipo: 'compra', fecha: sale.paidAt ?? sale.openedAt, sale })),
    ...cliente.pagos.map((pago): Movimiento => ({ tipo: 'abono', fecha: pago.createdAt, pago })),
  ]
    .filter((m) => filtro === 'todo' || (filtro === 'compras' ? m.tipo === 'compra' : m.tipo === 'abono'))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <>
      <PageHeader
        back={{ href: '/clientes', label: 'Clientes' }}
        title={`${cliente.nombre} ${cliente.apellido}`}
        badges={cliente.isActive ? <Chip tone="ok">Activo</Chip> : <Chip tone="off">Dado de baja</Chip>}
        subtitle={cliente.apodo ? `“${cliente.apodo}”` : undefined}
        actions={
          <Link href={`/clientes/${id}/editar`} className={buttonClasses('secondary', 'md')}>
            Editar
          </Link>
        }
      />

      {cliente.passwordResetRequestedAt && !recuperoUrl && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-kr-blue bg-kr-blue-soft px-4 py-3">
          <Bell size={22} weight="fill" className="flex-shrink-0 text-kr-blue" />
          <span className="min-w-[180px] flex-1 font-extrabold">
            Pidió recuperar su contraseña el {formatDateTime(cliente.passwordResetRequestedAt)}
          </span>
          <button
            type="button"
            onClick={() => recuperoMutation.mutate()}
            disabled={recuperoMutation.isPending}
            className={buttonClasses('secondary', 'md', '!border-kr-blue !text-kr-blue')}
          >
            {recuperoMutation.isPending ? 'Generando…' : 'Generar link'}
          </button>
        </div>
      )}

      {/* ficha cargada en el kiosco que nunca entró a la tienda: el registro ya no se la entrega a
          quien escriba su email (cualquiera podía quedarse con la cuenta), entra con este link */}
      {!cliente.tieneCuenta && !cliente.passwordResetRequestedAt && !recuperoUrl && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-kr-line bg-white px-4 py-3">
          <Key size={22} weight="bold" className="flex-shrink-0 text-kr-muted" />
          <span className="min-w-[180px] flex-1 font-extrabold">
            Todavía no entra a la tienda.
            <span className="block text-[13px] font-bold text-kr-muted">
              {cliente.email
                ? 'Si quiere ver su cuenta desde el celular, mandale un link para que elija su contraseña.'
                : 'Para darle acceso, primero cargale un email (Editar).'}
            </span>
          </span>
          {cliente.email && (
            <button
              type="button"
              onClick={() => recuperoMutation.mutate()}
              disabled={recuperoMutation.isPending}
              className={buttonClasses('secondary', 'md')}
            >
              {recuperoMutation.isPending ? 'Generando…' : 'Generar link de acceso'}
            </button>
          )}
        </div>
      )}

      {recuperoUrl && (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-kr-green-dark bg-kr-green-soft px-4 py-3">
          <p className="font-extrabold text-kr-green-dark">
            Link generado (vale 24 horas y sirve una sola vez). Mandáselo para que {cliente.tieneCuenta ? 'elija su contraseña nueva' : 'elija su contraseña y entre a su cuenta'}:
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <p className="min-w-0 flex-1 break-all rounded-xl border border-kr-line bg-white px-3 py-2.5 font-mono text-xs text-kr-navy">{recuperoUrl}</p>
            <button type="button" onClick={handleCopyRecupero} className={buttonClasses('secondary', 'md', 'flex-shrink-0')}>
              {copiedRecupero ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
              {copiedRecupero ? 'Copiado' : 'Copiar'}
            </button>
            {cliente.telefono && (
              <a
                href={waLink(
                  cliente.telefono,
                  cliente.tieneCuenta
                    ? `Hola ${cliente.nombre}! Para restablecer tu contraseña de Kiosco Kramer entrá a este link: ${recuperoUrl}`
                    : `Hola ${cliente.nombre}! Ya podés ver tu cuenta del Kiosco Kramer desde el celular. Entrá a este link para elegir tu contraseña (ingresás con ${cliente.email}): ${recuperoUrl}`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses('success', 'md', 'flex-shrink-0')}
              >
                <WhatsappLogo size={18} weight="fill" />
                Enviar por WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card highlight aria-labelledby="h-deuda">
            <span id="h-deuda" className="text-xs font-extrabold uppercase tracking-wide text-kr-muted">Deuda actual</span>
            <span className={`font-display text-[40px] leading-none tabular-nums ${deuda > 0 ? 'text-kr-orange-dark' : 'text-kr-navy'}`}>
              {money(deuda)}
            </span>
            <BarraLimite deuda={deuda} limite={cliente.creditLimit} grande />
            <span className="text-xs font-bold text-kr-muted">Se calcula con los precios de hoy.</span>
          </Card>

          <Card aria-labelledby="h-abono">
            <CardTitle id="h-abono">Registrar abono</CardTitle>
            <form onSubmit={handlePago} className="flex flex-col gap-3">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2.5">
                <Field label="Monto" htmlFor="ab-monto">
                  <input
                    ref={montoRef}
                    id="ab-monto"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={pagoAmount}
                    onChange={(e) => setPagoAmount(e.target.value)}
                    placeholder="0"
                    className={inputClasses('no-spin text-lg')}
                  />
                </Field>
                <Field label="Nota (opcional)" htmlFor="ab-nota">
                  <input id="ab-nota" type="text" value={pagoNote} onChange={(e) => setPagoNote(e.target.value)} className={inputClasses()} />
                </Field>
              </div>
              {deuda > 0 && (
                <button type="button" onClick={() => setPagoAmount(String(deuda))} className="self-start text-[13px] font-extrabold text-kr-blue hover:underline">
                  Paga todo: {money(deuda)}
                </button>
              )}
              {pagoError && <p role="alert" className="rounded-lg bg-[#FFE7D6] px-3 py-2 text-sm font-bold text-kr-orange-dark">{pagoError}</p>}
              <button type="submit" disabled={!pagoAmount || pagoMutation.isPending} className={buttonClasses('primary', 'md')}>
                {pagoMutation.isPending ? 'Guardando…' : 'Registrar abono'}
              </button>
            </form>
          </Card>

          <Card aria-labelledby="h-datos">
            <CardTitle id="h-datos">Datos</CardTitle>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              <dt className="font-extrabold text-kr-muted">Teléfono</dt>
              <dd className="font-bold">
                {cliente.telefono ? <a href={`tel:${cliente.telefono}`} className="text-kr-blue hover:underline">{cliente.telefono}</a> : '—'}
              </dd>
              <dt className="font-extrabold text-kr-muted">Dirección</dt>
              <dd className="font-bold">{cliente.direccion ?? '—'}</dd>
              <dt className="font-extrabold text-kr-muted">Email</dt>
              <dd className="break-all font-bold">{cliente.email ?? '—'}</dd>
              <dt className="font-extrabold text-kr-muted">DNI</dt>
              <dd className="font-bold tabular-nums">{cliente.dni ?? '—'}</dd>
              <dt className="font-extrabold text-kr-muted">Límite</dt>
              <dd className="font-bold">{cliente.creditLimit ? money(cliente.creditLimit) : 'Sin límite'}</dd>
              <dt className="font-extrabold text-kr-muted">Cliente desde</dt>
              <dd className="font-bold">{new Date(cliente.createdAt).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</dd>
            </dl>
            <button
              type="button"
              onClick={() => setConfirmToggle(true)}
              className={buttonClasses(cliente.isActive ? 'danger' : 'secondary', 'sm', 'self-start')}
            >
              {cliente.isActive ? 'Dar de baja' : 'Reactivar'}
            </button>
          </Card>
        </div>

        <Card flush aria-labelledby="h-cc" className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-kr-line px-4 py-3.5 sm:px-5">
            <CardTitle id="h-cc" className="flex-1">Cuenta corriente</CardTitle>
            <Segmented<FiltroMov>
              ariaLabel="Filtrar movimientos"
              value={filtro}
              onChange={setFiltro}
              options={[
                { value: 'todo', label: 'Todo' },
                { value: 'compras', label: 'Compras', count: cliente.sales.length },
                { value: 'abonos', label: 'Abonos', count: cliente.pagos.length },
              ]}
            />
          </div>
          {movimientos.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm font-bold text-kr-muted">
              {filtro === 'abonos' ? 'Todavía no registró ningún abono.' : filtro === 'compras' ? 'Todavía no tiene compras a crédito.' : 'Todavía no hay movimientos.'}
            </p>
          ) : (
            <ul>
              {movimientos.map((m) => (m.tipo === 'compra' ? <FilaCompra key={`c-${m.sale.id}`} sale={m.sale} /> : <FilaAbono key={`a-${m.pago.id}`} pago={m.pago} />))}
            </ul>
          )}
        </Card>
      </div>

      <StickyActionBar className="lg:hidden">
        <span className="flex flex-col">
          <span className="text-xs font-extrabold text-kr-muted">Deuda</span>
          <span className="font-extrabold tabular-nums">{money(deuda)}</span>
        </span>
        <span className="flex-1" />
        <button type="button" onClick={irAlAbono} className={buttonClasses('primary', 'md')}>
          Registrar abono
        </button>
      </StickyActionBar>

      {confirmToggle && (
        <ConfirmModal
          message={
            cliente.isActive
              ? '¿Dar de baja a este cliente? No se le va a poder cobrar un crédito nuevo hasta reactivarlo.'
              : '¿Reactivar a este cliente?'
          }
          confirmLabel={cliente.isActive ? 'Dar de baja' : 'Reactivar'}
          loading={toggleMutation.isPending}
          onConfirm={() => toggleMutation.mutate()}
          onCancel={() => setConfirmToggle(false)}
        />
      )}
    </>
  );
}

function FilaCompra({ sale }: { sale: Sale }) {
  const cancelada = sale.status === 'CANCELLED';
  return (
    <li className="flex items-start gap-3 border-b border-dashed border-kr-line px-4 py-3 last:border-b-0 sm:px-5">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#FFE7D6] text-kr-orange-dark">
        <ShoppingBag size={18} weight="bold" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-extrabold">
          Compra a crédito
          {cancelada && <Chip tone="off">Cancelada</Chip>}
        </p>
        <ul className="mt-1 flex flex-col gap-0.5 text-[13px] font-bold text-kr-muted">
          {sale.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span className="min-w-0">{item.quantity} × {item.name}</span>
              <span className="flex-shrink-0 tabular-nums">{money(item.subtotal)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
        <span className={`font-extrabold tabular-nums ${cancelada ? 'text-kr-muted line-through' : 'text-kr-orange-dark'}`}>+{money(sale.total)}</span>
        <span className="text-xs font-extrabold text-kr-muted">{formatDateTime(sale.paidAt ?? sale.openedAt)}</span>
      </div>
    </li>
  );
}

function FilaAbono({ pago }: { pago: ClientePago }) {
  return (
    <li className="flex items-start gap-3 border-b border-dashed border-kr-line px-4 py-3 last:border-b-0 sm:px-5">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-kr-green-soft text-kr-green-dark">
        <ArrowDownLeft size={18} weight="bold" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">Abono</p>
        {pago.note && <p className="text-[13px] font-bold text-kr-muted">{pago.note}</p>}
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
        <span className="font-extrabold tabular-nums text-kr-green-dark">−{money(pago.amount)}</span>
        <span className="text-xs font-extrabold text-kr-muted">{formatDateTime(pago.createdAt)}</span>
      </div>
    </li>
  );
}
