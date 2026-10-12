import Link from 'next/link';
import { Bicycle, CaretRight, WarningCircle } from '@phosphor-icons/react';
import { Pedido } from '@/lib/api';
import { money, PAYMENT_LABEL } from '@/lib/format';
import { buttonClasses } from '@/components/ui/Button';
import { cantidadProductos, DEMORA_MIN, haceCuanto, minutosDesde } from './pedidoUtils';

// qué le toca hacer al pedido en cada columna. El botón lleva al detalle (ahí está el aviso
// por WhatsApp de cada paso), no cambia el estado desde la tarjeta.
function siguientePaso(p: Pedido): string {
  if (p.status === 'NUEVO') return 'Preparar';
  if (p.status === 'EN_PREPARACION') return p.repartidor ? 'Mandar en camino' : 'Asignar repartidor';
  return 'Marcar entregado';
}

export default function PedidoCard({ pedido: p, now }: { pedido: Pedido; now: number }) {
  const min = minutosDesde(p.createdAt, now);
  const demorado = min >= DEMORA_MIN;
  const cant = cantidadProductos(p);

  return (
    <article
      className={`flex min-w-0 flex-col gap-2 rounded-2xl bg-white p-3.5 ${demorado ? 'border-2 border-kr-orange-dark' : 'border border-kr-line'}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/pedidos/${p.id}`} className="font-display text-xl leading-none hover:text-kr-blue">
          {p.numero}
        </Link>
        <span
          title={`Entró a las ${new Date(p.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
          className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-extrabold whitespace-nowrap ${
            demorado ? 'bg-kr-orange-dark text-white' : 'bg-kr-sand text-kr-navy'
          }`}
        >
          {haceCuanto(min)}
        </span>
      </div>

      <p className="font-extrabold leading-snug">{p.nombreCliente}</p>
      <p className="text-[13px] font-bold leading-snug text-kr-muted">{p.direccion}</p>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-extrabold">
          {cant} {cant === 1 ? 'producto' : 'productos'} · <span className="tabular-nums">{money(p.total)}</span>
        </span>
        <span
          className={`rounded-lg border px-2 py-0.5 text-xs font-extrabold ${
            p.paymentMethod === 'TRANSFER' ? 'border-[#B9CFEE] bg-kr-blue-soft text-kr-blue' : 'border-kr-line bg-kr-paper'
          }`}
        >
          {PAYMENT_LABEL[p.paymentMethod]}
        </span>
        {p.distanciaKm === null && (
          <span title="Envío estimado: no se pudo ubicar la dirección, confirmar con el cliente" className="inline-flex items-center gap-1 text-xs font-extrabold text-kr-orange-dark">
            <WarningCircle size={15} weight="fill" />
            Envío sin confirmar
          </span>
        )}
      </div>

      {p.repartidor && (
        <p className={`flex items-center gap-1.5 text-[13px] font-extrabold ${p.pendienteConfirmacion ? 'text-kr-orange-dark' : ''}`}>
          <Bicycle size={16} weight="bold" className="flex-shrink-0" />
          {p.repartidor.nombre}
          {p.pendienteConfirmacion && <span className="font-bold"> · esperando que confirme</span>}
        </p>
      )}

      <Link href={`/pedidos/${p.id}`} className={buttonClasses('primary', 'md', 'mt-1 w-full whitespace-normal')}>
        {siguientePaso(p)}
        <CaretRight size={16} weight="bold" />
      </Link>
    </article>
  );
}
