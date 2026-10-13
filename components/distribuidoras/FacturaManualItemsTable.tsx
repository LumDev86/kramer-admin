'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { facturas, products, FacturaItem } from '@/lib/api';
import { X } from '@phosphor-icons/react';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { buttonClasses } from '@/components/ui/Button';
import { PEDIDOSYA_RECARGO } from '@/components/productos/precio';
import { celdaInput, celdaLabel } from './estilos';
import { money } from '@/lib/format';

interface Props {
  facturaId: string;
  items: FacturaItem[];
  onChanged: () => void;
  // el backend solo permite eliminar líneas de una factura pendiente de revisión - al
  // corregir una ya confirmada desde el historial no hay botón de borrar, solo editar/agregar
  allowRemove?: boolean;
  // una factura cancelada queda de solo lectura (el backend rechaza cualquier edición)
  readOnly?: boolean;
  // si la distribuidora discrimina IVA aparte del precio neto (ver Distribuidor.ivaDiscriminado)
  // - acá no hay IA leyendo la factura, así que se ofrece una calculadora manual (ya existe
  // para bultos, esta es la misma idea para IVA) en vez de aplicarlo solo
  ivaDiscriminado?: boolean;
}

const FIELDS = ['cantidad', 'costo', 'precio', 'ganancia', 'codigoArticulo'] as const;
type Field = (typeof FIELDS)[number];

const focusCell = (row: number, field: Field) => {
  const el = document.querySelector<HTMLInputElement>(`[data-row="${row}"][data-field="${field}"]`);
  el?.focus();
  el?.select();
};

// tabla de líneas para una factura armada a mano: a diferencia de la revisión de una factura
// escaneada (FacturaItemRow), acá el producto ya viene vinculado desde que se agrega la línea,
// así que todo se edita directo en la fila - cantidad/costo/código van al ítem de la factura,
// precio/ganancia van al producto (confirmar la factura es lo que sincroniza el costo final
// al producto). Navegable con flechas arriba/abajo (misma columna, otra fila), Enter (guarda
// y pasa al siguiente campo de la fila) y Tab (orden natural del navegador).
export default function FacturaManualItemsTable({
  facturaId,
  items,
  onChanged,
  allowRemove = true,
  readOnly = false,
  ivaDiscriminado = false,
}: Props) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [bultoOpenId, setBultoOpenId] = useState<string | null>(null);
  const [bultoUnidades, setBultoUnidades] = useState('');
  const [bultoPrecio, setBultoPrecio] = useState('');
  const [bultoCantidad, setBultoCantidad] = useState('1');
  // toggle a nivel de toda la factura: cuando está prendido, "Costo" pasa a interpretarse
  // como el precio NETO (el que figura en la boleta), y se muestran columnas calculadas
  // con el IVA sumado. Lo que se termina guardando en precioUnitario (y de ahí al costo real
  // del producto) SIEMPRE es el valor con IVA - el neto nunca se persiste en ningún lado, es
  // solo una forma más cómoda de cargar el dato tal como viene impreso en la factura real.
  const [ivaFacturaOn, setIvaFacturaOn] = useState(false);
  const [ivaFacturaPct, setIvaFacturaPct] = useState('21');
  // override de alícuota por línea, para el caso de un producto con una tasa distinta a la
  // general de la factura (ej. alimentos básicos al 10,5% en una factura mayormente al 21%)
  const [ivaPorItem, setIvaPorItem] = useState<Record<string, string>>({});
  const pctParaItem = (itemId: string) => ivaPorItem[itemId] ?? ivaFacturaPct;

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Parameters<typeof facturas.updateItem>[2] }) =>
      facturas.updateItem(facturaId, itemId, data),
    onSuccess: () => { onChanged(); setError(''); },
    onError: (err: any) => setError(err.message ?? 'No se pudo guardar el cambio'),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ productId, price }: { productId: string; price: number }) => {
      const form = new FormData();
      form.append('price', String(price));
      return products.update(productId, form);
    },
    onSuccess: () => {
      onChanged();
      qc.invalidateQueries({ queryKey: ['products'] });
      setError('');
    },
    onError: (err: any) => setError(err.message ?? 'No se pudo guardar el precio'),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => facturas.removeItem(facturaId, itemId),
    onSuccess: onChanged,
  });

  // punto único de guardado del costo real (siempre con IVA sumado si corresponde) - lo usan
  // el input de Costo y los de Subtotal (neto y c/IVA), que son 3 formas distintas de llegar
  // al mismo valor final. Mantiene el % de ganancia actual, recalculando el precio de venta
  // para conservar el mismo margen contra el costo nuevo.
  const commitCostoConIva = (item: FacturaItem, costoConIvaActual: number, nuevoCostoConIva: number) => {
    if (Math.abs(nuevoCostoConIva - costoConIvaActual) < 0.005) return;
    updateItemMutation.mutate({ itemId: item.id, data: { precioUnitario: nuevoCostoConIva } });
    const product = item.product;
    if (product && costoConIvaActual > 0) {
      const currentPct = (Number(product.price) - costoConIvaActual) / costoConIvaActual;
      const newPrice = parseFloat((nuevoCostoConIva * (1 + currentPct)).toFixed(2));
      if (newPrice > 0) updateProductMutation.mutate({ productId: product.id, price: newPrice });
    }
  };

  const openBulto = (item: FacturaItem) => {
    setBultoOpenId(item.id);
    setBultoUnidades(item.unidadesPorBultoDetectada != null ? String(item.unidadesPorBultoDetectada) : '');
    setBultoPrecio('');
    setBultoCantidad('1');
  };

  // convierte "compré N bultos de esta caja a $X cada una, y cada caja trae Y unidades" a lo
  // que realmente se guarda (cantidad y costo SIEMPRE en unidades individuales, igual que
  // hace la IA al leer una factura escaneada por bulto - ver invoiceExtraction.ts)
  const applyBulto = (item: FacturaItem) => {
    const unidades = parseInt(bultoUnidades);
    const precioBulto = parseFloat(bultoPrecio);
    const bultos = parseFloat(bultoCantidad || '1');
    if (!(unidades > 0) || !(precioBulto > 0) || !(bultos > 0)) {
      setError('Completá unidades por bulto, precio del bulto y cantidad de bultos comprados');
      return;
    }
    const cantidadTotal = Math.round(bultos * unidades);
    const costoUnitario = parseFloat((precioBulto / unidades).toFixed(2));
    updateItemMutation.mutate({
      itemId: item.id,
      data: { cantidad: cantidadTotal, precioUnitario: costoUnitario, unidadesPorBulto: unidades },
    });

    // mantiene el % de ganancia actual, igual que al editar el costo a mano
    const product = item.product;
    const costoActual = Number(item.precioUnitario);
    if (product && costoActual > 0) {
      const currentPct = (Number(product.price) - costoActual) / costoActual;
      const newPrice = parseFloat((costoUnitario * (1 + currentPct)).toFixed(2));
      if (newPrice > 0) updateProductMutation.mutate({ productId: product.id, price: newPrice });
    }

    setBultoOpenId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, row: number, field: Field) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (row > 0) focusCell(row - 1, field);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (row < items.length - 1) focusCell(row + 1, field);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
      const idx = FIELDS.indexOf(field);
      if (idx < FIELDS.length - 1) focusCell(row, FIELDS[idx + 1]);
      else if (row < items.length - 1) focusCell(row + 1, FIELDS[0]);
    }
  };

  const totalNeto = items.reduce((sum, item) => {
    const pctRaw = parseFloat(pctParaItem(item.id));
    const pct = !isNaN(pctRaw) && pctRaw >= 0 ? pctRaw : 0;
    const costoConIva = Number(item.precioUnitario);
    const costoNeto = ivaFacturaOn ? costoConIva / (1 + pct / 100) : costoConIva;
    return sum + costoNeto * Number(item.cantidad);
  }, 0);
  const totalConIva = items.reduce((sum, item) => sum + Number(item.subtotal), 0);

  // con IVA hay tres columnas más: la fila entera recién entra en pantallas muy anchas (2xl);
  // antes de eso cada producto se muestra como tarjeta con los campos rotulados
  const L = ivaFacturaOn ? LAYOUT.iva : LAYOUT.normal;
  const busy = readOnly || updateItemMutation.isPending || updateProductMutation.isPending;

  return (
    <div className="flex flex-col">
      {ivaDiscriminado && !readOnly && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-kr-line bg-kr-blue-soft px-3 py-2.5 md:px-4">
          <ToggleSwitch
            label="Cargar costos sin IVA en esta factura"
            checked={ivaFacturaOn}
            onChange={() => setIvaFacturaOn((v) => !v)}
          />
          <span className="text-sm font-extrabold text-kr-navy">Cargar costos sin IVA (neto)</span>
          {ivaFacturaOn && (
            <label className="flex items-center gap-1.5 text-sm font-bold text-kr-muted">
              Alícuota general
              <input
                type="number"
                step="0.1"
                min="0"
                value={ivaFacturaPct}
                onChange={(e) => setIvaFacturaPct(e.target.value)}
                className={`${celdaInput} !w-16 text-right`}
              />
              %
            </label>
          )}
          <span className="basis-full text-xs font-bold text-kr-muted">
            {ivaFacturaOn
              ? 'Tipeá el costo como figura en la factura; se guarda con el IVA sumado.'
              : 'Esta distribuidora discrimina IVA: prendelo para tipear los costos netos.'}
          </span>
        </div>
      )}

      <div className={`${L.head} gap-x-2.5 border-b border-kr-line bg-kr-paper px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-kr-muted`}>
        <span>Producto</span>
        <span className="text-right">Cant.</span>
        <span className="text-right">{ivaFacturaOn ? 'Costo neto' : 'Costo'}</span>
        {ivaFacturaOn && (
          <>
            <span className="text-right text-kr-blue">IVA %</span>
            <span className="text-right text-kr-blue">Costo c/IVA</span>
          </>
        )}
        <span className="text-right">Precio</span>
        <span className="text-right">PedidosYa</span>
        <span className="text-right">Ganan.</span>
        <span>Cód. art.</span>
        <span className="text-right">{ivaFacturaOn ? 'Subt. neto' : 'Subtotal'}</span>
        {ivaFacturaOn && <span className="text-right text-kr-blue">Subt. c/IVA</span>}
        <span />
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm font-bold text-kr-muted">Todavía no hay productos en esta factura.</p>
      ) : (
        <ul>
          {items.map((item, row) => {
            const product = item.product;
            const costoConIva = Number(item.precioUnitario);
            const pctRaw = parseFloat(pctParaItem(item.id));
            const itemPct = !isNaN(pctRaw) && pctRaw >= 0 ? pctRaw : 0;
            const costoNeto = ivaFacturaOn ? costoConIva / (1 + itemPct / 100) : costoConIva;
            const costo = costoConIva; // el costo "real" (para ganancia/margen) siempre es el que tiene IVA sumado
            const precio = product ? Number(product.price) : null;
            const pct = product && costo > 0 ? ((precio! - costo) / costo) * 100 : null;
            const nombre = product?.title ?? item.nombreDetectado;

            const quitar = allowRemove && !readOnly && (
              <button
                type="button"
                onClick={() => removeItemMutation.mutate(item.id)}
                aria-label={`Quitar ${nombre}`}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-kr-muted hover:bg-[#FFE7D6] hover:text-kr-orange-dark"
              >
                <X size={18} weight="bold" />
              </button>
            );

            return (
              <li key={item.id} className={`${L.row} flex flex-col gap-2.5 border-b border-dashed border-kr-line px-3 py-3 last:border-b-0 md:px-4`}>
                <div className="flex min-w-0 items-start gap-2.5">
                  {product && (
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-[10px] border border-kr-line bg-kr-sand">
                      <Image src={product.imageUrl} alt="" fill sizes="40px" className="object-contain p-0.5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="font-extrabold leading-snug text-kr-navy">{nombre}</p>
                    {item.unidadesPorBultoDetectada != null && bultoOpenId !== item.id && (
                      <p className="text-xs font-bold text-kr-muted">{item.unidadesPorBultoDetectada} un. por bulto</p>
                    )}
                  </div>
                  <span className={L.cardOnly}>{quitar}</span>
                </div>

                <div className={`${L.fields} grid grid-cols-3 gap-2 sm:grid-cols-4`}>
                  <label className="flex min-w-0 flex-col gap-1">
                    <span className={`${celdaLabel} ${L.label}`}>Cant.</span>
                    <input
                      key={item.cantidad}
                      data-row={row}
                      data-field="cantidad"
                      type="number"
                      inputMode="numeric"
                      step="1"
                      min="1"
                      aria-label={`Cantidad de ${nombre}`}
                      defaultValue={item.cantidad}
                      disabled={busy}
                      onKeyDown={(e) => handleKeyDown(e, row, 'cantidad')}
                      onBlur={(e) => {
                        const val = Math.round(parseFloat(e.target.value));
                        if (isNaN(val) || val < 1) { e.target.value = String(item.cantidad); return; }
                        if (val === item.cantidad) return;
                        updateItemMutation.mutate({ itemId: item.id, data: { cantidad: val } });
                      }}
                      className={`${celdaInput} ${L.right}`}
                    />
                  </label>

                  <div className="flex min-w-0 flex-col gap-1">
                    <span className={`${celdaLabel} ${L.label}`}>{ivaFacturaOn ? 'Costo neto' : 'Costo'}</span>
                    <input
                      key={`${item.precioUnitario}-${ivaFacturaOn}-${itemPct}`}
                      data-row={row}
                      data-field="costo"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      aria-label={`Costo de ${nombre}`}
                      defaultValue={costoNeto.toFixed(2)}
                      disabled={busy}
                      onKeyDown={(e) => handleKeyDown(e, row, 'costo')}
                      onBlur={(e) => {
                        const tipeado = parseFloat(e.target.value);
                        if (isNaN(tipeado) || tipeado < 0) { e.target.value = costoNeto.toFixed(2); return; }
                        // si el toggle de IVA está prendido, lo tipeado es el neto - lo que
                        // se guarda como costo real es siempre el valor con IVA ya sumado
                        const nuevoCostoConIva = ivaFacturaOn
                          ? parseFloat((tipeado * (1 + itemPct / 100)).toFixed(2))
                          : tipeado;
                        commitCostoConIva(item, costoConIva, nuevoCostoConIva);
                      }}
                      className={`${celdaInput} ${L.right}`}
                    />
                    {!readOnly && (
                      <button
                        type="button"
                        title="Calcular a partir del precio de un bulto o caja"
                        aria-expanded={bultoOpenId === item.id}
                        onClick={() => (bultoOpenId === item.id ? setBultoOpenId(null) : openBulto(item))}
                        className={`self-start rounded-md px-1.5 py-0.5 text-xs font-extrabold ${L.selfEnd} ${
                          bultoOpenId === item.id ? 'bg-kr-yellow-soft text-kr-navy' : 'text-kr-blue hover:bg-kr-blue-soft'
                        }`}
                      >
                        Por bulto
                      </button>
                    )}
                  </div>

                  {ivaFacturaOn && (
                    <>
                      <label className="flex min-w-0 flex-col gap-1">
                        <span className={`${celdaLabel} ${L.label} text-kr-blue`}>IVA %</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          disabled={busy}
                          aria-label={`IVA de ${nombre}`}
                          defaultValue={pctParaItem(item.id)}
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            setIvaPorItem((prev) => ({ ...prev, [item.id]: raw === '' ? ivaFacturaPct : raw }));
                          }}
                          className={`${celdaInput} ${L.right} !text-kr-blue`}
                        />
                      </label>
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className={`${celdaLabel} ${L.label} text-kr-blue`}>Costo c/IVA</span>
                        <span className={`py-2 font-extrabold tabular-nums text-kr-blue ${L.right}`}>{money(costoConIva)}</span>
                      </div>
                    </>
                  )}

                  <label className="flex min-w-0 flex-col gap-1">
                    <span className={`${celdaLabel} ${L.label}`}>Precio</span>
                    {product ? (
                      <input
                        key={product.price}
                        data-row={row}
                        data-field="precio"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        aria-label={`Precio de venta de ${nombre}`}
                        defaultValue={product.price}
                        disabled={busy}
                        onKeyDown={(e) => handleKeyDown(e, row, 'precio')}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (isNaN(val) || val <= 0) { e.target.value = product.price; return; }
                          if (val === precio) return;
                          updateProductMutation.mutate({ productId: product.id, price: val });
                        }}
                        className={`${celdaInput} ${L.right}`}
                      />
                    ) : (
                      <span className={`py-2 font-extrabold text-kr-muted ${L.right}`}>—</span>
                    )}
                  </label>

                  <div className="flex min-w-0 flex-col gap-1">
                    <span className={`${celdaLabel} ${L.label}`}>PedidosYa</span>
                    <span className={`py-2 font-extrabold tabular-nums text-kr-muted ${L.right}`}>
                      {product ? money(Number(product.price) * (1 + PEDIDOSYA_RECARGO / 100)) : '—'}
                    </span>
                  </div>

                  <label className="flex min-w-0 flex-col gap-1">
                    <span className={`${celdaLabel} ${L.label}`}>Ganancia</span>
                    {product ? (
                      <span className="flex items-center gap-1">
                        <input
                          key={`${item.precioUnitario}-${product.price}`}
                          data-row={row}
                          data-field="ganancia"
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          aria-label={`Porcentaje de ganancia de ${nombre}`}
                          defaultValue={pct !== null ? pct.toFixed(1) : ''}
                          placeholder="—"
                          disabled={!costo || busy}
                          onKeyDown={(e) => handleKeyDown(e, row, 'ganancia')}
                          onBlur={(e) => {
                            if (!costo) return;
                            const raw = e.target.value;
                            const newPct = parseFloat(raw);
                            if (raw === '' || isNaN(newPct)) { e.target.value = pct !== null ? pct.toFixed(1) : ''; return; }
                            if (pct !== null && Math.abs(newPct - pct) < 0.05) return;
                            const newPrice = parseFloat((costo * (1 + newPct / 100)).toFixed(2));
                            if (newPrice <= 0) { e.target.value = pct !== null ? pct.toFixed(1) : ''; return; }
                            updateProductMutation.mutate({ productId: product.id, price: newPrice });
                          }}
                          className={`${celdaInput} ${L.right} ${
                            pct === null ? '' : pct >= 0 ? '!text-kr-green-dark' : '!text-kr-orange-dark'
                          }`}
                        />
                        <span className="text-sm font-extrabold text-kr-muted">%</span>
                      </span>
                    ) : (
                      <span className={`py-2 font-extrabold text-kr-muted ${L.right}`}>—</span>
                    )}
                  </label>

                  <label className="flex min-w-0 flex-col gap-1">
                    <span className={`${celdaLabel} ${L.label}`}>Cód. art.</span>
                    <input
                      key={item.codigoArticuloDetectado ?? ''}
                      data-row={row}
                      data-field="codigoArticulo"
                      type="text"
                      aria-label={`Código de artículo de ${nombre}`}
                      defaultValue={item.codigoArticuloDetectado ?? ''}
                      disabled={busy}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                        handleKeyDown(e, row, 'codigoArticulo');
                      }}
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val === (item.codigoArticuloDetectado ?? '')) return;
                        updateItemMutation.mutate({ itemId: item.id, data: { codigoArticulo: val || null } });
                      }}
                      placeholder="—"
                      className={`${celdaInput} !text-sm !font-bold`}
                    />
                  </label>

                  <label className="flex min-w-0 flex-col gap-1">
                    <span className={`${celdaLabel} ${L.label}`}>{ivaFacturaOn ? 'Subt. neto' : 'Subtotal'}</span>
                    <input
                      key={`subneto-${item.precioUnitario}-${ivaFacturaOn}-${itemPct}-${item.cantidad}`}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      disabled={busy}
                      aria-label={`Subtotal de ${nombre}`}
                      defaultValue={(ivaFacturaOn ? costoNeto * Number(item.cantidad) : Number(item.subtotal)).toFixed(2)}
                      onBlur={(e) => {
                        const tipeado = parseFloat(e.target.value);
                        if (isNaN(tipeado) || tipeado < 0 || !(Number(item.cantidad) > 0)) return;
                        const nuevoCostoUnitNeto = tipeado / Number(item.cantidad);
                        const nuevoCostoConIva = ivaFacturaOn
                          ? parseFloat((nuevoCostoUnitNeto * (1 + itemPct / 100)).toFixed(2))
                          : parseFloat(nuevoCostoUnitNeto.toFixed(2));
                        commitCostoConIva(item, costoConIva, nuevoCostoConIva);
                      }}
                      className={`${celdaInput} ${L.right}`}
                    />
                  </label>

                  {ivaFacturaOn && (
                    <label className="flex min-w-0 flex-col gap-1">
                      <span className={`${celdaLabel} ${L.label} text-kr-blue`}>Subt. c/IVA</span>
                      <input
                        key={`subiva-${item.precioUnitario}-${item.cantidad}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        disabled={busy}
                        aria-label={`Subtotal con IVA de ${nombre}`}
                        defaultValue={Number(item.subtotal).toFixed(2)}
                        onBlur={(e) => {
                          const tipeado = parseFloat(e.target.value);
                          if (isNaN(tipeado) || tipeado < 0 || !(Number(item.cantidad) > 0)) return;
                          const nuevoCostoConIva = parseFloat((tipeado / Number(item.cantidad)).toFixed(2));
                          commitCostoConIva(item, costoConIva, nuevoCostoConIva);
                        }}
                        className={`${celdaInput} ${L.right} !text-kr-blue`}
                      />
                    </label>
                  )}

                  <span className={`${L.rowOnly} justify-end`}>{quitar}</span>
                </div>

                {bultoOpenId === item.id && (
                  <div className="col-span-full flex flex-wrap items-end gap-2 rounded-xl border-[1.5px] border-kr-line bg-kr-paper p-3 animate-fadeIn">
                    <label className="flex flex-col gap-1">
                      <span className={celdaLabel}>Unidades por bulto</span>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        autoFocus
                        value={bultoUnidades}
                        onChange={(e) => setBultoUnidades(e.target.value)}
                        className={`${celdaInput} !w-24`}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={celdaLabel}>Precio del bulto</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bultoPrecio}
                        onChange={(e) => setBultoPrecio(e.target.value)}
                        className={`${celdaInput} !w-32`}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={celdaLabel}>Bultos comprados</span>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={bultoCantidad}
                        onChange={(e) => setBultoCantidad(e.target.value)}
                        className={`${celdaInput} !w-24`}
                      />
                    </label>
                    {parseFloat(bultoUnidades) > 0 && parseFloat(bultoPrecio) > 0 && (
                      <p className="pb-2.5 text-sm font-extrabold text-kr-navy">
                        = {Math.round((parseFloat(bultoCantidad) || 1) * parseFloat(bultoUnidades))} un. a{' '}
                        {money(parseFloat(bultoPrecio) / parseFloat(bultoUnidades))} c/u
                      </p>
                    )}
                    <div className="ml-auto flex gap-2">
                      <button type="button" onClick={() => setBultoOpenId(null)} className={buttonClasses('secondary', 'sm')}>
                        Cancelar
                      </button>
                      <button type="button" onClick={() => applyBulto(item)} className={buttonClasses('primary', 'sm')}>
                        Aplicar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {ivaFacturaOn && items.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t border-kr-line px-4 py-2.5 text-sm">
          <span className="font-bold text-kr-muted">Total neto: <b className="tabular-nums text-kr-navy">{money(totalNeto)}</b></span>
          <span className="font-bold text-kr-blue">Total con IVA: <b className="tabular-nums">{money(totalConIva)}</b></span>
        </div>
      )}
      {error && <p role="alert" className="mx-4 my-2 rounded-lg bg-[#FFE7D6] px-3 py-2 text-sm font-bold text-kr-orange-dark">{error}</p>}
    </div>
  );
}

// clases literales por variante (Tailwind no arma clases con breakpoints variables)
const LAYOUT = {
  normal: {
    row: 'xl:grid xl:grid-cols-[minmax(0,1fr)_64px_112px_104px_96px_84px_104px_112px_40px] xl:items-start xl:gap-x-2.5',
    head: 'hidden xl:grid xl:grid-cols-[minmax(0,1fr)_64px_112px_104px_96px_84px_104px_112px_40px]',
    fields: 'xl:contents',
    label: 'xl:hidden',
    right: 'xl:text-right',
    selfEnd: 'xl:self-end',
    cardOnly: 'xl:hidden',
    rowOnly: 'hidden xl:flex',
  },
  iva: {
    row: '2xl:grid 2xl:grid-cols-[minmax(0,1fr)_60px_104px_64px_100px_100px_92px_84px_96px_104px_104px_40px] 2xl:items-start 2xl:gap-x-2',
    head: 'hidden 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_60px_104px_64px_100px_100px_92px_84px_96px_104px_104px_40px]',
    fields: '2xl:contents',
    label: '2xl:hidden',
    right: '2xl:text-right',
    selfEnd: '2xl:self-end',
    cardOnly: '2xl:hidden',
    rowOnly: 'hidden 2xl:flex',
  },
};
