'use client';

import { useState, type InputHTMLAttributes } from 'react';
import Card, { CardTitle } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/Button';
import { money } from '@/lib/format';
import { gananciaPct, pctValor, precioConGanancia, PEDIDOSYA_RECARGO, redondear } from './precio';

interface Props {
  cost: string;
  price: string;
  onCost: (v: string) => void;
  onPrice: (v: string) => void;
}

const chico = 'no-spin box-border min-h-9 rounded-[10px] border-[1.5px] border-kr-line bg-kr-paper px-2 py-1 text-sm font-extrabold text-kr-navy outline-none focus:border-kr-blue disabled:opacity-50';

function PesosInput({ grande, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { grande?: boolean }) {
  return (
    <span className={`box-border flex min-h-11 items-center gap-1 rounded-xl border-[1.5px] border-kr-line bg-kr-paper px-3 focus-within:border-kr-blue ${className}`}>
      <span className={`font-extrabold text-kr-muted ${grande ? 'text-xl' : ''}`}>$</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        className={`no-spin min-w-0 flex-1 bg-transparent py-2 font-extrabold tabular-nums text-kr-navy outline-none placeholder:font-semibold placeholder:text-kr-muted/70 ${grande ? 'text-[22px]' : 'text-[15px]'}`}
        {...rest}
      />
    </span>
  );
}

// costo, precio y ganancia del formulario de producto, en un solo bloque destacado
export default function PrecioCard({ cost, price, onCost, onPrice }: Props) {
  const [bultoUnidades, setBultoUnidades] = useState('');
  const [bultoCosto, setBultoCosto] = useState('');
  const [gananciaDeseada, setGananciaDeseada] = useState('');

  const costNum = parseFloat(cost);
  const priceNum = parseFloat(price);
  const tieneCosto = costNum > 0;
  const pct = gananciaPct(tieneCosto ? costNum : null, priceNum);
  const ganancia = tieneCosto && !isNaN(priceNum) ? priceNum - costNum : null;

  const unidades = parseFloat(bultoUnidades);
  const costoBulto = parseFloat(bultoCosto);
  const costoPorUnidad = unidades > 0 && costoBulto > 0 ? redondear(costoBulto / unidades) : null;

  const usarCostoBulto = () => {
    if (costoPorUnidad === null) return;
    onCost(String(costoPorUnidad));
    setBultoUnidades('');
    setBultoCosto('');
  };

  const cambiarGanancia = (v: string) => {
    setGananciaDeseada(v);
    const n = parseFloat(v);
    if (tieneCosto && !isNaN(n)) onPrice(String(precioConGanancia(costNum, n)));
  };

  return (
    <Card highlight aria-labelledby="h-precio" className="gap-3.5">
      <CardTitle id="h-precio">Precio</CardTitle>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pf-costo" className="text-[13px] font-extrabold text-kr-muted">Costo mayorista (por unidad)</label>
        <PesosInput id="pf-costo" value={cost} onChange={(e) => onCost(e.target.value)} placeholder="Se completa solo al confirmar una factura" />
        <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold text-kr-muted">
          <span>¿Lo comprás por bulto?</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            aria-label="Unidades por bulto"
            placeholder="Unid."
            value={bultoUnidades}
            onChange={(e) => setBultoUnidades(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); usarCostoBulto(); } }}
            className={`${chico} w-16`}
          />
          <span>unidades por</span>
          <span className="inline-flex items-center gap-0.5">
            $
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              aria-label="Costo del bulto"
              placeholder="Bulto"
              value={bultoCosto}
              onChange={(e) => setBultoCosto(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); usarCostoBulto(); } }}
              className={`${chico} w-24`}
            />
          </span>
          <button type="button" disabled={costoPorUnidad === null} onClick={usarCostoBulto} className={buttonClasses('secondary', 'sm')}>
            {costoPorUnidad !== null ? `Usar ${money(costoPorUnidad)}` : 'Usar'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pf-precio" className="text-[13px] font-extrabold text-kr-muted">Precio de venta</label>
        <PesosInput id="pf-precio" grande required value={price} onChange={(e) => onPrice(e.target.value)} placeholder="0" />
        <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold text-kr-muted">
          <label htmlFor="pf-ganancia-deseada">Ganancia deseada</label>
          <input
            id="pf-ganancia-deseada"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={gananciaDeseada}
            onChange={(e) => cambiarGanancia(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            disabled={!tieneCosto}
            placeholder={tieneCosto ? '30' : '—'}
            className={`${chico} w-16`}
          />
          <span>%</span>
          {!tieneCosto && <span className="basis-full text-xs">Cargá el costo para calcular el precio con un %.</span>}
        </div>
      </div>

      {ganancia !== null && pct !== null ? (
        <div
          className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-xl px-3.5 py-3 font-extrabold ${
            ganancia >= 0 ? 'bg-kr-green-soft text-kr-green-dark' : 'bg-[#FFE7D6] text-kr-orange-dark'
          }`}
        >
          <span>{ganancia >= 0 ? 'Ganás por unidad' : 'Perdés por unidad'}</span>
          <b className="font-display text-2xl font-normal tabular-nums">
            {money(Math.abs(ganancia))} · {pctValor(pct)}%
          </b>
        </div>
      ) : (
        <p className="rounded-xl bg-kr-sand px-3.5 py-3 text-sm font-bold text-kr-muted">Con el costo cargado vas a ver cuánto ganás por unidad.</p>
      )}

      {priceNum > 0 && (
        <p className="text-[13px] font-bold text-kr-muted">
          Precio sugerido para PedidosYa (+{PEDIDOSYA_RECARGO}%):{' '}
          <span className="font-extrabold text-kr-navy tabular-nums">{money(redondear(priceNum * (1 + PEDIDOSYA_RECARGO / 100)))}</span>
        </p>
      )}
    </Card>
  );
}
