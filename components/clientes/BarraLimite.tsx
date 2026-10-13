import { money } from '@/lib/format';

interface Props {
  deuda: number;
  limite: string | null;
  // grande: la del detalle del cliente, con "le quedan $X"
  grande?: boolean;
}

// cuánto de su límite de crédito tiene usado el cliente. Verde hasta 70%, naranja después
// (se está por quedar sin crédito) y lleno al pasarse. Sin límite no hay barra.
export default function BarraLimite({ deuda, limite, grande }: Props) {
  const lim = limite ? Number(limite) : 0;
  if (!(lim > 0)) {
    return <span className="text-xs font-extrabold text-kr-muted">Sin límite</span>;
  }
  const pct = Math.round((deuda / lim) * 100);
  const color = pct >= 100 ? 'bg-kr-orange-dark' : pct >= 70 ? 'bg-kr-orange' : 'bg-kr-green';

  return (
    <span className={`flex min-w-0 flex-col ${grande ? 'gap-1.5' : 'gap-1'}`}>
      <span
        role="img"
        aria-label={`Usó el ${pct}% de su límite de ${money(lim)}`}
        className={`block w-full overflow-hidden rounded-full border-[1.5px] border-kr-navy bg-kr-sand ${grande ? 'h-3.5' : 'h-2'}`}
      >
        <span className={`block h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </span>
      {grande ? (
        <span className="flex flex-wrap justify-between gap-x-3 text-[13px] font-extrabold text-kr-muted">
          <span>Usó {pct}% de {money(lim)}</span>
          <span className={pct >= 100 ? 'text-kr-orange-dark' : ''}>
            {pct >= 100 ? `Se pasó ${money(deuda - lim)}` : `Le quedan ${money(lim - deuda)}`}
          </span>
        </span>
      ) : (
        <span className="text-xs font-extrabold text-kr-muted">{pct}% de {money(lim)}</span>
      )}
    </span>
  );
}
