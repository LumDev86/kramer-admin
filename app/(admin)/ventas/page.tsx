'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { sales, products, cashSessions, Sale, SaleItem, Product, Cliente, PaymentMethod, CashSession } from '@/lib/api';
import { Plus, Trash, X, Receipt, Wallet, ChartBar, Check, MagnifyingGlass, WhatsappLogo, CalendarBlank } from '@phosphor-icons/react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ProductSearchModal from '@/components/ui/ProductSearchModal';
import ClienteSearchModal from '@/components/ui/ClienteSearchModal';
import VentasDelDiaModal from '@/components/ui/VentasDelDiaModal';

const money = (value: number | string) =>
  `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// no hay un folio secuencial real en el modelo (ver ventas-pos-feature) - se usa el final
// del id, más corto y legible para identificar el ticket a simple vista
const folioOf = (id: string) => id.slice(-8).toUpperCase();

// wa.me necesita el número con código de país sin signos; mismo criterio que el resto del admin
const toWhatsappNumber = (telefono: string): string => {
  const digits = telefono.replace(/\D/g, '');
  return digits.startsWith('54') ? digits : `549${digits}`;
};

const waLink = (telefono: string, mensaje: string) =>
  `https://wa.me/${toWhatsappNumber(telefono)}?text=${encodeURIComponent(mensaje)}`;

const buildTicketMessage = (sale: Sale): string => {
  const fecha = new Date(sale.paidAt ?? sale.openedAt).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const lineas = sale.items.map((item) => `${item.quantity} x ${item.name} — ${money(item.subtotal)}`).join('\n');
  return `Hola! Te compartimos el ticket de tu compra en Kiosco Kramer 🛒\nTicket ${folioOf(sale.id)} · ${fecha}\n\n${lineas}\n\nTotal: ${money(sale.total)}`;
};

export default function VentasPage() {
  const qc = useQueryClient();
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [activeSaleId, setActiveSaleId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [scanError, setScanError] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [toCancel, setToCancel] = useState<Sale | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [clienteSearchOpen, setClienteSearchOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [payError, setPayError] = useState('');
  const [openingAmount, setOpeningAmount] = useState('');
  const [openSessionError, setOpenSessionError] = useState('');
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closingAmount, setClosingAmount] = useState('');
  const [closeError, setCloseError] = useState('');
  const [closeResult, setCloseResult] = useState<CashSession | null>(null);
  const [ventasDelDiaOpen, setVentasDelDiaOpen] = useState(false);
  const [customerPhoneOpen, setCustomerPhoneOpen] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [lastPaidSale, setLastPaidSale] = useState<Sale | null>(null);

  const { data: openSales } = useQuery({ queryKey: ['sales', 'open'], queryFn: sales.getOpen });
  const { data: currentSession, isLoading: sessionLoading } = useQuery({
    queryKey: ['cash-session', 'current'],
    queryFn: cashSessions.getCurrent,
  });
  const { data: closeBreakdown } = useQuery({
    queryKey: ['cash-session', 'breakdown', closeResult?.id],
    queryFn: () => cashSessions.getBreakdown(closeResult!.id),
    enabled: !!closeResult,
  });

  const openSessionMutation = useMutation({
    mutationFn: (amount: number) => cashSessions.open(amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-session', 'current'] });
      setOpeningAmount('');
      setOpenSessionError('');
    },
    onError: (err: any) => setOpenSessionError(err.message ?? 'Error al abrir la caja'),
  });

  const closeSessionMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => cashSessions.close(id, amount),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ['cash-session', 'current'] });
      setCloseResult(session);
      setCloseError('');
    },
    onError: (err: any) => setCloseError(err.message ?? 'Error al cerrar la caja'),
  });

  const tickets = openSales ?? [];
  const activeSale = tickets.find((s) => s.id === activeSaleId) ?? tickets[0] ?? null;

  useEffect(() => {
    if (!activeSaleId && tickets.length > 0) setActiveSaleId(tickets[0].id);
  }, [activeSaleId, tickets]);

  useEffect(() => {
    scanInputRef.current?.focus();
  }, [activeSale?.id]);

  const createSaleMutation = useMutation({
    mutationFn: sales.create,
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ['sales', 'open'] });
      setActiveSaleId(sale.id);
    },
  });

  const addItemMutation = useMutation({
    mutationFn: ({ saleId, data }: { saleId: string; data: Parameters<typeof sales.addItem>[1] }) =>
      sales.addItem(saleId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales', 'open'] }),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ saleId, itemId, quantity }: { saleId: string; itemId: string; quantity: number }) =>
      sales.updateItem(saleId, itemId, { quantity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales', 'open'] }),
  });

  const removeItemMutation = useMutation({
    mutationFn: ({ saleId, itemId }: { saleId: string; itemId: string }) => sales.removeItem(saleId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales', 'open'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (saleId: string) => sales.cancel(saleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales', 'open'] });
      setToCancel(null);
      setActiveSaleId(null);
    },
  });

  const payMutation = useMutation({
    mutationFn: ({ saleId, data }: { saleId: string; data: Parameters<typeof sales.pay>[1] }) =>
      sales.pay(saleId, data),
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ['sales', 'open'] });
      qc.invalidateQueries({ queryKey: ['cash-session', 'current'] });
      setActiveSaleId(null);
      setPaidAmount('');
      setSelectedCliente(null);
      setPayError('');
      setCustomerPhoneOpen(false);
      setCustomerPhone('');
      setLastPaidSale(sale.customerPhone ? sale : null);
    },
    onError: (err: any) => setPayError(err.message ?? 'Error al cobrar'),
  });

  const ensureActiveSale = async (): Promise<string> => {
    if (activeSale) return activeSale.id;
    const sale = await createSaleMutation.mutateAsync();
    return sale.id;
  };

  const addProduct = async (product: Product) => {
    const saleId = await ensureActiveSale();
    // ya tenemos nombre y precio (vinieron de la búsqueda/escaneo), se los pasamos al
    // backend para que no tenga que volver a buscarlos - menos ida y vuelta a la base, más rápido
    addItemMutation.mutate({
      saleId,
      data: { productId: product.id, name: product.title, unitPrice: Number(product.price) },
    });
    setQuery('');
    setScanError('');
    scanInputRef.current?.focus();
  };

  // el escáner solo lee el código de barras: busca ese producto por código exacto y nada más.
  // buscar por nombre es una función aparte (botón "Manual"), no un fallback automático acá.
  const handleCode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setScanError('');

    const product = await products.getByBarcode(trimmed);
    if (product) {
      await addProduct(product);
      return;
    }

    setScanError(`No se encontró ningún producto con el código "${trimmed}".`);
  };

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const code = query;
    setQuery('');
    handleCode(code);
  };

  // handleCode se redefine en cada render (usa closures de estado); un ref evita que el
  // listener global (que se suscribe una sola vez) quede atado a una versión vieja.
  const handleCodeRef = useRef(handleCode);
  handleCodeRef.current = handleCode;

  // El lector de código de barras es un teclado USB: tipea rápido y termina en Enter.
  // Si el cursor no está parado en el input de escaneo (foco en un botón, en ningún lado,
  // etc.) sus teclas se pierden. Para que el escaneo funcione esté o no el foco ahí,
  // escuchamos el teclado a nivel de toda la pantalla y armamos el código nosotros mismos,
  // salvo que el foco esté en un campo de texto real (ahí sí queremos que el usuario tipee
  // normalmente: precio manual, "paga con...", monto de cierre de caja, etc.)
  useEffect(() => {
    let buffer = '';
    const handler = (e: KeyboardEvent) => {
      // F10 abre/cierra el buscador manual de productos (para cuando el lector no reconoce
      // el código) sin importar dónde esté el foco; preventDefault evita que el navegador
      // lo interprete como atajo para activar la barra de menú.
      if (e.key === 'F10') {
        e.preventDefault();
        setProductSearchOpen((o) => !o);
        return;
      }
      if (e.key === 'F1') {
        e.preventDefault();
        handleF1Ref.current();
        return;
      }
      if (e.key === 'F2') {
        e.preventDefault();
        handleF2Ref.current();
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      const isEditable =
        !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
      if (isEditable) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        const code = buffer;
        buffer = '';
        if (code) handleCodeRef.current(code);
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleAddManual = async () => {
    if (!manualName.trim() || !manualPrice) return;
    const saleId = await ensureActiveSale();
    addItemMutation.mutate({
      saleId,
      data: { name: manualName.trim(), unitPrice: parseFloat(manualPrice) },
    });
    setManualOpen(false);
    setManualName('');
    setManualPrice('');
    setQuery('');
    scanInputRef.current?.focus();
  };

  const total = activeSale ? Number(activeSale.total) : 0;
  // "Paga con..." es opcional: si el cajero no lo completa, se asume pago exacto (el
  // backend ya default-ea paidAmount al total cuando no se lo mandamos).
  const paidAmountNumber = paidAmount === '' ? total : parseFloat(paidAmount) || 0;
  const change = paymentMethod === 'CASH' ? paidAmountNumber - total : 0;
  const canPay =
    !!activeSale &&
    activeSale.items.length > 0 &&
    (paymentMethod === 'CASH' ? paidAmountNumber >= total
      : paymentMethod === 'CREDIT' ? !!selectedCliente
      : true);

  const handlePay = () => {
    if (!activeSale) return;
    setPayError('');
    payMutation.mutate({
      saleId: activeSale.id,
      data: {
        paymentMethod,
        ...(paymentMethod === 'CASH' && paidAmount !== '' && { paidAmount: paidAmountNumber }),
        ...(paymentMethod === 'CREDIT' && selectedCliente && { clienteId: selectedCliente.id }),
        ...(customerPhone.trim() && { customerPhone: customerPhone.trim() }),
      },
    });
  };

  // F1 = "cobrar a crédito": pasa el método a CREDIT y abre el buscador de clientes (si ya
  // hay uno elegido de antes, no auto-cobra — que lo confirme a propósito con F2).
  const handleF1 = () => {
    if (clienteSearchOpen) return; // mientras el buscador está abierto, dejamos que sus propios atajos manden
    if (!activeSale || activeSale.items.length === 0 || payMutation.isPending) return;
    setPaymentMethod('CREDIT');
    if (!selectedCliente) setClienteSearchOpen(true);
  };
  const handleF1Ref = useRef(handleF1);
  handleF1Ref.current = handleF1;

  // F2 = "cobrar en efectivo": si ya estábamos en medio de un cobro a crédito con cliente
  // elegido, F2 lo confirma tal cual (no lo pisa); si no, cobra en efectivo directo sin
  // depender de qué botón haya quedado tildado antes.
  const handleF2 = () => {
    if (clienteSearchOpen) return; // mientras el buscador está abierto, F2 confirma el cliente resaltado ahí
    if (!activeSale || activeSale.items.length === 0 || payMutation.isPending) return;

    if (paymentMethod === 'CREDIT' && selectedCliente) {
      handlePay();
      return;
    }

    setPayError('');
    setPaymentMethod('CASH');
    payMutation.mutate({
      saleId: activeSale.id,
      data: {
        paymentMethod: 'CASH',
        ...(paidAmount !== '' && { paidAmount: paidAmountNumber }),
        ...(customerPhone.trim() && { customerPhone: customerPhone.trim() }),
      },
    });
  };
  const handleF2Ref = useRef(handleF2);
  handleF2Ref.current = handleF2;

  if (sessionLoading) {
    return <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />;
  }

  if (!currentSession) {
    return (
      <>
        <div className="flex flex-col gap-6 max-w-md">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">Ventas</h1>
            <p className="text-sm text-gray-400 font-medium mt-0.5">Abrí la caja para empezar a vender</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                <Wallet size={20} weight="fill" className="text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">Abrir caja</p>
                <p className="text-xs text-gray-400">Ingresá el efectivo con el que arrancás el turno</p>
              </div>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              placeholder="Monto inicial en efectivo"
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 font-semibold"
            />
            {openSessionError && (
              <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{openSessionError}</p>
            )}
            <button
              onClick={() => openSessionMutation.mutate(parseFloat(openingAmount))}
              disabled={!openingAmount || openSessionMutation.isPending}
              className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-extrabold transition-colors disabled:opacity-50"
            >
              {openSessionMutation.isPending ? 'Abriendo...' : 'Abrir caja'}
            </button>
          </div>
        </div>
        {closeModalOpen && closeResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm animate-slideUp flex flex-col gap-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    Number(closeResult.difference) === 0
                      ? 'bg-green-100'
                      : Number(closeResult.difference) < 0
                      ? 'bg-red-100'
                      : 'bg-amber-100'
                  }`}
                >
                  <Check
                    size={24}
                    weight="bold"
                    className={
                      Number(closeResult.difference) === 0
                        ? 'text-green-600'
                        : Number(closeResult.difference) < 0
                        ? 'text-red-500'
                        : 'text-amber-500'
                    }
                  />
                </div>
                <p className="text-sm font-bold text-gray-700">Caja cerrada</p>
              </div>
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Esperado</span><span className="font-semibold">{money(closeResult.expectedAmount!)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Contado</span><span className="font-semibold">{money(closeResult.closingAmount!)}</span></div>
                <div className="flex justify-between border-t border-gray-100 pt-1.5">
                  <span className="text-gray-500">Diferencia</span>
                  <span
                    className={`font-bold ${
                      Number(closeResult.difference) === 0
                        ? 'text-green-600'
                        : Number(closeResult.difference) < 0
                        ? 'text-red-500'
                        : 'text-amber-500'
                    }`}
                  >
                    {Number(closeResult.difference) > 0 ? '+' : ''}{money(closeResult.difference!)}
                    {Number(closeResult.difference) < 0 ? ' (faltante)' : Number(closeResult.difference) > 0 ? ' (sobrante)' : ''}
                  </span>
                </div>
                {closeBreakdown && (
                  <div className="flex justify-between border-t border-gray-100 pt-1.5">
                    <span className="text-gray-500">Ganancia del turno</span>
                    <span className="font-bold text-gray-700">{money(closeBreakdown.profit)}</span>
                  </div>
                )}
              </div>
              {closeBreakdown && closeBreakdown.byCategory.length > 0 && (
                <div className="flex flex-col gap-1 bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Ventas por categoría</p>
                  {closeBreakdown.byCategory.map((c) => (
                    <div key={c.name} className="flex justify-between text-xs">
                      <span className="text-gray-500">{c.name}</span>
                      <span className="font-semibold text-gray-600">{money(c.total)}</span>
                    </div>
                  ))}
                </div>
              )}
              {closeBreakdown && closeBreakdown.byProduct.length > 0 && (
                <div className="flex flex-col gap-1 bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Productos más vendidos</p>
                  {closeBreakdown.byProduct.map((p) => (
                    <div key={p.name} className="flex justify-between text-xs">
                      <span className="text-gray-500">{p.quantity} × {p.name}</span>
                      <span className="font-semibold text-gray-600">{money(p.total)}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => { setCloseModalOpen(false); setCloseResult(null); setClosingAmount(''); }}
                className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Ventas</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">Registrá ventas escaneando productos</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setVentasDelDiaOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-orange-500 transition-colors"
          >
            <CalendarBlank size={18} weight="bold" />
            Ventas del día
          </button>
          <Link
            href="/reportes"
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-orange-500 transition-colors"
          >
            <ChartBar size={18} weight="bold" />
            Ver reportes
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <Wallet size={18} weight="fill" className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-700">
              Caja abierta desde {new Date(currentSession.openedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-gray-400">
              Inicial: {money(currentSession.openingAmount)} · Efectivo del turno: {money(currentSession.salesCash)}
            </p>
          </div>
        </div>
        <button
          onClick={() => setCloseModalOpen(true)}
          className="py-2 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cerrar caja
        </button>
      </div>

      {lastPaidSale && (
        <div className="bg-green-50 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <WhatsappLogo size={18} weight="fill" className="text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-700">
                Ticket {folioOf(lastPaidSale.id)} cobrado · {money(lastPaidSale.total)}
              </p>
              <p className="text-xs text-gray-500 truncate">Enviale el comprobante al cliente por WhatsApp</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={waLink(lastPaidSale.customerPhone!, buildTicketMessage(lastPaidSale))}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors"
            >
              <WhatsappLogo size={16} weight="fill" />
              Enviar por WhatsApp
            </a>
            <button
              onClick={() => setLastPaidSale(null)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
          {/* Pestañas de tickets abiertos */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {tickets.map((sale, i) => (
              <div key={sale.id} className="relative flex-shrink-0">
                <button
                  onClick={() => setActiveSaleId(sale.id)}
                  className={`flex items-center gap-2 pl-4 pr-8 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    activeSale?.id === sale.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Receipt size={16} weight={activeSale?.id === sale.id ? 'fill' : 'regular'} />
                  Ticket {i + 1}
                </button>
                <button
                  onClick={() => setToCancel(sale)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded ${
                    activeSale?.id === sale.id ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-red-500'
                  }`}
                >
                  <X size={12} weight="bold" />
                </button>
              </div>
            ))}
            <button
              onClick={() => createSaleMutation.mutate()}
              disabled={createSaleMutation.isPending}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              <Plus size={16} weight="bold" />
              Nuevo ticket
            </button>
          </div>

          {/* Escaneo */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                ref={scanInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleScanKeyDown}
                placeholder="Escaneá o tipeá el código y presioná Enter"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 font-semibold"
              />
              <button
                onClick={() => setProductSearchOpen(true)}
                title="Buscar producto (F10)"
                className="flex-shrink-0 flex items-center gap-2 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <MagnifyingGlass size={16} weight="bold" />
                <span className="hidden sm:inline">Buscar</span>
                <span className="hidden md:inline text-xs text-gray-400 font-medium">F10</span>
              </button>
              <button
                onClick={() => setManualOpen(true)}
                className="flex-shrink-0 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Manual
              </button>
            </div>

            {scanError && (
              <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{scanError}</p>
            )}

            {manualOpen && (
              <div className="flex flex-col gap-2 bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Producto manual</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Descripción"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 font-medium"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder="Precio"
                    className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 font-medium"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setManualOpen(false); setManualName(''); setManualPrice(''); }}
                    className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddManual}
                    disabled={!manualName.trim() || !manualPrice}
                    className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Carrito */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Producto</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-32">Cantidad</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Subtotal</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!activeSale || activeSale.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400 font-medium">
                      Sin productos todavía. Escaneá o buscá uno para empezar.
                    </td>
                  </tr>
                ) : (
                  activeSale.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-700">{item.name}</p>
                        <p className="text-xs text-gray-400">{money(item.unitPrice)} c/u</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              updateItemMutation.mutate({
                                saleId: activeSale.id,
                                itemId: item.id,
                                quantity: Math.max(1, item.quantity - 1),
                              })
                            }
                            className="w-6 h-6 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 flex items-center justify-center font-bold"
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() =>
                              updateItemMutation.mutate({
                                saleId: activeSale.id,
                                itemId: item.id,
                                quantity: item.quantity + 1,
                              })
                            }
                            className="w-6 h-6 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-orange-500">{money(item.subtotal)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => removeItemMutation.mutate({ saleId: activeSale.id, itemId: item.id })}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash size={14} weight="bold" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Cobro */}
          {activeSale && activeSale.items.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-extrabold text-gray-800">{money(total)}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    paymentMethod === 'CASH' ? 'bg-orange-500 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  Efectivo <span className="opacity-60 font-medium">· F2</span>
                </button>
                <button
                  onClick={() => { setPaymentMethod('CREDIT'); if (!selectedCliente) setClienteSearchOpen(true); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    paymentMethod === 'CREDIT' ? 'bg-orange-500 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  Crédito <span className="opacity-60 font-medium">· F1</span>
                </button>
              </div>

              {paymentMethod === 'CREDIT' && (
                <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-sm font-semibold text-gray-700 truncate">
                    {selectedCliente
                      ? `${selectedCliente.nombre} ${selectedCliente.apellido}`
                      : 'Sin cliente seleccionado'}
                  </p>
                  <button
                    onClick={() => setClienteSearchOpen(true)}
                    className="flex-shrink-0 text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors"
                  >
                    {selectedCliente ? 'Cambiar' : 'Elegir cliente'}
                  </button>
                </div>
              )}

              {paymentMethod === 'CASH' && (
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="Paga con... (opcional)"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
                  />
                  <p className={`text-sm font-bold ${change >= 0 ? 'text-green-600' : 'text-gray-300'}`}>
                    Vuelto: {paidAmount !== '' && change >= 0 ? money(change) : '—'}
                  </p>
                </div>
              )}

              {customerPhoneOpen ? (
                <div className="flex items-center gap-2">
                  <WhatsappLogo size={16} weight="fill" className="text-green-600 flex-shrink-0" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="WhatsApp del cliente (opcional)"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 font-medium"
                  />
                  <button
                    onClick={() => { setCustomerPhoneOpen(false); setCustomerPhone(''); }}
                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  >
                    <X size={14} weight="bold" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCustomerPhoneOpen(true)}
                  className="self-start flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-green-600 transition-colors"
                >
                  <WhatsappLogo size={14} weight="fill" />
                  Guardar WhatsApp del cliente para enviarle el ticket
                </button>
              )}

              {payError && (
                <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{payError}</p>
              )}

              <button
                onClick={handlePay}
                disabled={!canPay || payMutation.isPending}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-extrabold transition-colors disabled:opacity-50"
              >
                {payMutation.isPending
                  ? 'Cobrando...'
                  : paymentMethod === 'CREDIT' && !selectedCliente
                  ? 'F1 · Elegir cliente'
                  : paymentMethod === 'CREDIT'
                  ? `F2 · Cobrar ${money(total)} a crédito`
                  : `F2 · Cobrar ${money(total)} en efectivo`}
              </button>
            </div>
          )}
      </div>

      {productSearchOpen && (
        <ProductSearchModal
          onSelect={(product) => { setProductSearchOpen(false); addProduct(product); }}
          onClose={() => setProductSearchOpen(false)}
        />
      )}

      {clienteSearchOpen && (
        <ClienteSearchModal
          onSelect={(cliente) => { setSelectedCliente(cliente); setClienteSearchOpen(false); }}
          onClose={() => setClienteSearchOpen(false)}
        />
      )}

      {toCancel && (
        <ConfirmModal
          message={`¿Cancelar el ticket? ${toCancel.items.length > 0 ? 'Se perderán los productos cargados.' : ''}`}
          loading={cancelMutation.isPending}
          onConfirm={() => cancelMutation.mutate(toCancel.id)}
          onCancel={() => setToCancel(null)}
        />
      )}

      {ventasDelDiaOpen && (
        <VentasDelDiaModal
          currentSessionId={currentSession.id}
          onClose={() => setVentasDelDiaOpen(false)}
        />
      )}

      {closeModalOpen && !closeResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm animate-slideUp flex flex-col gap-4">
            <p className="text-sm font-bold text-gray-700">Cerrar caja</p>
            <div className="flex flex-col gap-1.5 text-sm bg-gray-50 rounded-xl p-3">
              <div className="flex justify-between"><span className="text-gray-500">Inicial</span><span className="font-semibold">{money(currentSession.openingAmount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Ventas efectivo</span><span className="font-semibold">{money(currentSession.salesCash)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Ventas a crédito</span><span className="font-semibold">{money(currentSession.salesCredit)}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-1.5"><span className="text-gray-500">Esperado</span><span className="font-bold">{money(Number(currentSession.openingAmount) + currentSession.salesCash)}</span></div>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={closingAmount}
              onChange={(e) => setClosingAmount(e.target.value)}
              placeholder="Monto contado"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-semibold"
            />
            {closeError && (
              <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{closeError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setCloseModalOpen(false); setClosingAmount(''); setCloseError(''); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  closeSessionMutation.mutate({ id: currentSession.id, amount: parseFloat(closingAmount) })
                }
                disabled={!closingAmount || closeSessionMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors disabled:opacity-60"
              >
                {closeSessionMutation.isPending ? 'Cerrando...' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
