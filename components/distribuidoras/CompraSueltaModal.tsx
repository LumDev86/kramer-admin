'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { categories, distribuidores, Product } from '@/lib/api';
import { money } from '@/lib/format';
import Modal from '@/components/ui/Modal';
import Field, { inputClasses } from '@/components/ui/Field';
import ProductSearchModal from '@/components/ui/ProductSearchModal';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { gananciaPct, pctValor, precioConGanancia } from '@/components/productos/precio';
import NuevoProductoManualForm from './NuevoProductoManualForm';

interface Props {
  distribuidorId: string;
  distribuidorNombre: string;
  onClose: () => void;
  onRegistrada: () => void;
}

// compra rápida de un solo producto (sin armar una factura): se elige el producto, se carga
// cantidad, costo y precio, y queda registrada como una compra confirmada de la distribuidora
export default function CompraSueltaModal({ distribuidorId, distribuidorNombre, onClose, onRegistrada }: Props) {
  const toast = useToast();
  const [paso, setPaso] = useState<'buscar' | 'datos' | 'nuevo'>('buscar');
  const [producto, setProducto] = useState<Product | null>(null);
  const [cantidad, setCantidad] = useState('1');
  const [costo, setCosto] = useState('');
  const [precio, setPrecio] = useState('');
  const [codigoArticulo, setCodigoArticulo] = useState('');
  const [error, setError] = useState('');

  const { data: catsData } = useQuery({
    queryKey: ['categories', { parentId: 'null', limit: 100 }],
    queryFn: () => categories.getAll({ parentId: 'null', limit: 100 }),
    enabled: paso === 'nuevo',
  });

  const elegir = (p: Product) => {
    setProducto(p);
    setCosto(p.cost ?? '');
    setPrecio(p.price);
    setCantidad('1');
    setCodigoArticulo('');
    setError('');
    setPaso('datos');
  };

  const compraMutation = useMutation({
    mutationFn: () => {
      const precioNum = parseFloat(precio);
      return distribuidores.registrarCompraManual(distribuidorId, producto!.id, {
        cantidad: parseFloat(cantidad || '1'),
        costo: parseFloat(costo),
        ...(precio !== '' && !isNaN(precioNum) && precioNum !== Number(producto!.price) && { precio: precioNum }),
        ...(codigoArticulo.trim() && { codigoArticulo: codigoArticulo.trim() }),
      });
    },
    onSuccess: () => {
      toast.show(`Compra de "${producto!.title}" registrada`);
      onRegistrada();
      onClose();
    },
    onError: (err: any) => setError(err.message ?? 'No se pudo registrar la compra'),
  });

  if (paso === 'buscar') {
    return <ProductSearchModal onSelect={elegir} onClose={onClose} onCreateNew={() => setPaso('nuevo')} />;
  }

  if (paso === 'nuevo') {
    return (
      <Modal title="Producto nuevo" subtitle={`Compra suelta a ${distribuidorNombre}`} onClose={onClose} size="lg">
        <NuevoProductoManualForm
          categories={catsData?.data ?? []}
          categoriesLoading={!catsData}
          onRegistrar={(product, cant, cst, codArt) =>
            distribuidores.registrarCompraManual(distribuidorId, product.id, { cantidad: cant, costo: cst, codigoArticulo: codArt })
          }
          onCreated={() => { toast.show('Producto creado y compra registrada'); onRegistrada(); onClose(); }}
          onCancel={() => setPaso('buscar')}
        />
      </Modal>
    );
  }

  const costNum = parseFloat(costo) || 0;
  const precioNum = parseFloat(precio) || 0;
  const pct = gananciaPct(costNum || null, precioNum);
  const subtotal = costNum * (parseFloat(cantidad || '0') || 0);

  return (
    <Modal
      title="Compra de un producto suelto"
      subtitle={distribuidorNombre}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={() => setPaso('buscar')} className={buttonClasses('secondary', 'md')}>
            Elegir otro
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => compraMutation.mutate()}
            disabled={!costo || !precio || compraMutation.isPending}
            className={buttonClasses('success', 'md', 'flex-1 sm:flex-none')}
          >
            {compraMutation.isPending ? 'Guardando…' : 'Registrar compra'}
          </button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => { e.preventDefault(); if (costo && precio) compraMutation.mutate(); }}
      >
        {producto && (
          <div className="flex items-center gap-3">
            <span className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-kr-line bg-kr-sand">
              <Image src={producto.imageUrl} alt="" fill sizes="48px" className="object-contain p-1" />
            </span>
            <p className="font-extrabold leading-snug">{producto.title}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Cantidad" htmlFor="cs-cant">
            <input id="cs-cant" type="number" inputMode="numeric" step="1" min="1" autoFocus value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={inputClasses('no-spin')} />
          </Field>
          <Field label="Costo" htmlFor="cs-costo">
            <input id="cs-costo" type="number" inputMode="decimal" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} className={inputClasses('no-spin')} />
          </Field>
          <Field label="Precio de venta" htmlFor="cs-precio">
            <input id="cs-precio" type="number" inputMode="decimal" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className={inputClasses('no-spin')} />
          </Field>
          <Field label="Ganancia %" htmlFor="cs-gan">
            <input
              id="cs-gan"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={pct !== null ? pctValor(pct) : ''}
              disabled={!costNum}
              onChange={(e) => {
                const n = parseFloat(e.target.value);
                if (!isNaN(n) && costNum) setPrecio(String(precioConGanancia(costNum, n)));
              }}
              className={inputClasses(`no-spin ${pct === null ? '' : pct >= 0 ? '!text-kr-green-dark' : '!text-kr-orange-dark'}`)}
            />
          </Field>
        </div>

        <Field label="Código de artículo de esta distribuidora (opcional)" htmlFor="cs-cod">
          <input id="cs-cod" type="text" value={codigoArticulo} onChange={(e) => setCodigoArticulo(e.target.value)} className={inputClasses()} />
        </Field>

        {costNum > 0 && (
          <p className="flex items-baseline justify-between rounded-xl bg-kr-sand px-3.5 py-2.5 font-extrabold">
            <span className="text-sm text-kr-muted">Total de la compra</span>
            <span className="tabular-nums">{money(subtotal)}</span>
          </p>
        )}
        {error && <p role="alert" className="rounded-lg bg-[#FFE7D6] px-3 py-2 text-sm font-bold text-kr-orange-dark">{error}</p>}
        {/* Enter en cualquier campo registra la compra */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
