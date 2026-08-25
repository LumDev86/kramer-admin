'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { sales, products, cashSessions, Sale, Cliente, PaymentMethod, CashSession, Product } from '@/lib/api';
import { Wallet, ChartBar, CalendarBlank } from '@phosphor-icons/react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ProductSearchModal from '@/components/ui/ProductSearchModal';
import ClienteSearchModal from '@/components/ui/ClienteSearchModal';
import VentasDelDiaModal from '@/components/ui/VentasDelDiaModal';
import { money } from '@/lib/format';
import { Section } from '@/components/ventas/types';
import AbrirCajaScreen from '@/components/ventas/AbrirCajaScreen';
import CerrarCajaModal from '@/components/ventas/CerrarCajaModal';
import TicketsTabs from '@/components/ventas/TicketsTabs';
import EscaneoYManualCard from '@/components/ventas/EscaneoYManualCard';
import CarritoTable from '@/components/ventas/CarritoTable';
import CobroCard from '@/components/ventas/CobroCard';
import VentaCobradaCard from '@/components/ventas/VentaCobradaCard';

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
  const [lastPaidSale, setLastPaidSale] = useState<{ id: string; total: string; telefonoSugerido: string } | null>(null);
  const [sendWaOpen, setSendWaOpen] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [ventasDelDiaOpen, setVentasDelDiaOpen] = useState(false);
  const [section, setSection] = useState<Section>('scan');
  const [cartIndex, setCartIndex] = useState(0);
  const cartContainerRef = useRef<HTMLDivElement>(null);
  const efectivoBtnRef = useRef<HTMLButtonElement>(null);
  const creditoBtnRef = useRef<HTMLButtonElement>(null);
  const payButtonRef = useRef<HTMLButtonElement>(null);

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
    setSection('scan');
    setCartIndex(0);
  }, [activeSale?.id]);

  // si se saca un producto del carrito (o cambia por otro motivo), la fila resaltada no
  // puede quedar apuntando a un índice que ya no existe
  useEffect(() => {
    if (!activeSale) return;
    setCartIndex((i) => Math.min(i, Math.max(activeSale.items.length - 1, 0)));
  }, [activeSale?.items.length]);

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
    onSuccess: (sale, { data }) => {
      qc.invalidateQueries({ queryKey: ['sales', 'open'] });
      // deja el selector parado en el producto recién agregado (o cuya cantidad se acaba de
      // sumar, si ya estaba en el carrito - ver sale.service.ts addItem) para poder ajustarlo
      // con +/- al toque, en vez de que vuelva a la sección de escaneo y haya que ir a
      // buscarlo a mano con las flechas. Una línea manual (sin productId) siempre crea fila
      // nueva al final, así que ahí alcanza con apuntar al último ítem.
      const idx = data.productId ? sale.items.findIndex((i) => i.productId === data.productId) : sale.items.length - 1;
      if (idx >= 0) setCartIndex(idx);
      cartContainerRef.current?.focus();
    },
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

  // Tab recorre escaneo -> carrito -> pago -> cobrar en vez del orden natural del navegador
  // (que iría input por input, botón por botón) - mueve el foco de verdad a cada sección
  // para que el resaltado visual y los atajos de esa sección (flechas/+/-/Supr en el carrito)
  // queden sincronizados con dónde está realmente parado el cursor.
  const cycleSection = (dir: 1 | -1) => {
    if (!activeSale) return;
    const order: Section[] = ['scan', 'cart', 'payment', 'confirm'];
    const next = order[(order.indexOf(section) + dir + order.length) % order.length];
    setSection(next);
    if (next === 'scan') scanInputRef.current?.focus();
    else if (next === 'cart') cartContainerRef.current?.focus();
    else if (next === 'payment') (paymentMethod === 'CREDIT' ? creditoBtnRef : efectivoBtnRef).current?.focus();
    else if (next === 'confirm') payButtonRef.current?.focus();
  };
  const cycleSectionRef = useRef(cycleSection);
  cycleSectionRef.current = cycleSection;

  // ↑↓ para elegir qué fila del carrito está resaltada (solo tiene efecto en la sección "cart")
  const moveCartIndex = (delta: number) => {
    if (!activeSale) return;
    setCartIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(activeSale.items.length - 1, 0)));
  };
  const moveCartIndexRef = useRef(moveCartIndex);
  moveCartIndexRef.current = moveCartIndex;

  // +/- del teclado sobre la fila resaltada - mismo límite mínimo que ya usan los botones +/-
  const adjustCartQty = (delta: number) => {
    if (!activeSale) return;
    const item = activeSale.items[cartIndex];
    if (!item) return;
    updateItemMutation.mutate({ saleId: activeSale.id, itemId: item.id, quantity: Math.max(1, item.quantity + delta) });
  };
  const adjustCartQtyRef = useRef(adjustCartQty);
  adjustCartQtyRef.current = adjustCartQty;

  // Supr saca del ticket la fila resaltada del carrito
  const removeCartHighlighted = () => {
    if (!activeSale) return;
    const item = activeSale.items[cartIndex];
    if (!item) return;
    removeItemMutation.mutate({ saleId: activeSale.id, itemId: item.id });
  };
  const removeCartHighlightedRef = useRef(removeCartHighlighted);
  removeCartHighlightedRef.current = removeCartHighlighted;

  // mientras hay un modal abierto, Tab y las teclas de la sección "carrito" quedan en manos
  // del propio modal (tiene su recorrido natural o su propio manejo de teclado)
  const anyModalOpen = productSearchOpen || clienteSearchOpen || manualOpen || !!toCancel || ventasDelDiaOpen || closeModalOpen;
  const anyModalOpenRef = useRef(anyModalOpen);
  anyModalOpenRef.current = anyModalOpen;

  const activeSaleRef = useRef(activeSale);
  activeSaleRef.current = activeSale;

  const sectionRef = useRef(section);
  sectionRef.current = section;

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
      // el cliente elegido para el cobro a crédito ya no queda accesible después de este
      // reset - se lo guarda acá para sugerir su teléfono al mandar el ticket
      setLastPaidSale({ id: sale.id, total: sale.total, telefonoSugerido: selectedCliente?.telefono ?? '' });
      setActiveSaleId(null);
      setPaidAmount('');
      setSelectedCliente(null);
      setPayError('');
    },
    onError: (err: any) => setPayError(err.message ?? 'Error al cobrar'),
  });

  const ensureActiveSale = async (): Promise<string> => {
    if (activeSale) return activeSale.id;
    setLastPaidSale(null);
    setSendWaOpen(false);
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
    // el foco pasa al carrito (no de vuelta al escaneo) en el onSuccess de addItemMutation,
    // ya parado en la fila del producto recién agregado
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
      // Tab cambia de "sección" (escaneo -> carrito -> pago -> cobrar) en vez del recorrido
      // habitual del navegador; se ignora si hay un modal abierto (tienen su propio manejo)
      // o si todavía no hay un ticket activo (no hay nada que recorrer).
      if (e.key === 'Tab' && !anyModalOpenRef.current && activeSaleRef.current) {
        e.preventDefault();
        cycleSectionRef.current(e.shiftKey ? -1 : 1);
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      const isEditable =
        !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
      if (isEditable) return;

      // parado en la sección "carrito": flechas para elegir el producto, +/- para sumar o
      // restar cantidad, Supr para sacarlo del ticket
      if (sectionRef.current === 'cart' && activeSaleRef.current) {
        if (e.key === 'ArrowDown') { e.preventDefault(); moveCartIndexRef.current(1); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); moveCartIndexRef.current(-1); return; }
        if (e.key === '+') { e.preventDefault(); adjustCartQtyRef.current(1); return; }
        if (e.key === '-') { e.preventDefault(); adjustCartQtyRef.current(-1); return; }
        if (e.key === 'Delete') { e.preventDefault(); removeCartHighlightedRef.current(); return; }
      }

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
    // el foco pasa al carrito (no de vuelta al escaneo) en el onSuccess de addItemMutation
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
      },
    });
  };

  // F1 = "cobrar a crédito": pasa el método a CREDIT y abre el buscador de clientes (si ya
  // hay uno elegido de antes, no auto-cobra — que lo confirme a propósito con F2).
  const handleF1 = () => {
    if (clienteSearchOpen || productSearchOpen) return; // mientras un buscador está abierto, dejamos que sus propios atajos manden
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
    if (clienteSearchOpen || productSearchOpen) return; // mientras un buscador está abierto, dejamos que sus propios atajos manden
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
      <AbrirCajaScreen
        openingAmount={openingAmount}
        onOpeningAmountChange={setOpeningAmount}
        error={openSessionError}
        onOpen={() => openSessionMutation.mutate(parseFloat(openingAmount))}
        opening={openSessionMutation.isPending}
        closeModalOpen={closeModalOpen}
        closeResult={closeResult}
        closeBreakdown={closeBreakdown}
        onAcceptCloseResult={() => { setCloseModalOpen(false); setCloseResult(null); setClosingAmount(''); }}
      />
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

      <div className="flex flex-col gap-4">
        <TicketsTabs
          tickets={tickets}
          activeSaleId={activeSale?.id}
          onSelect={setActiveSaleId}
          onCancel={setToCancel}
          onNew={() => createSaleMutation.mutate()}
          creating={createSaleMutation.isPending}
        />

        <EscaneoYManualCard
          scanInputRef={scanInputRef}
          query={query}
          onQueryChange={setQuery}
          onScanKeyDown={handleScanKeyDown}
          onFocusScan={() => setSection('scan')}
          onOpenProductSearch={() => setProductSearchOpen(true)}
          scanError={scanError}
          manualOpen={manualOpen}
          onOpenManual={() => setManualOpen(true)}
          manualName={manualName}
          onManualNameChange={setManualName}
          manualPrice={manualPrice}
          onManualPriceChange={setManualPrice}
          onCancelManual={() => { setManualOpen(false); setManualName(''); setManualPrice(''); }}
          onAddManual={handleAddManual}
        />

        <CarritoTable
          cartContainerRef={cartContainerRef}
          section={section}
          onFocusCart={() => setSection('cart')}
          activeSale={activeSale}
          cartIndex={cartIndex}
          onHoverItem={setCartIndex}
          onIncrement={(item) =>
            activeSale &&
            updateItemMutation.mutate({ saleId: activeSale.id, itemId: item.id, quantity: item.quantity + 1 })
          }
          onDecrement={(item) =>
            activeSale &&
            updateItemMutation.mutate({ saleId: activeSale.id, itemId: item.id, quantity: Math.max(1, item.quantity - 1) })
          }
          onRemove={(item) => activeSale && removeItemMutation.mutate({ saleId: activeSale.id, itemId: item.id })}
        />

        {activeSale && activeSale.items.length > 0 && (
          <CobroCard
            section={section}
            total={total}
            paymentMethod={paymentMethod}
            onClickEfectivo={() => setPaymentMethod('CASH')}
            onClickCredito={() => { setPaymentMethod('CREDIT'); if (!selectedCliente) setClienteSearchOpen(true); }}
            onFocusPayment={() => setSection('payment')}
            selectedCliente={selectedCliente}
            onOpenClienteSearch={() => setClienteSearchOpen(true)}
            paidAmount={paidAmount}
            onPaidAmountChange={setPaidAmount}
            change={change}
            payError={payError}
            onPay={handlePay}
            canPay={canPay}
            paying={payMutation.isPending}
            onFocusConfirm={() => setSection('confirm')}
            efectivoBtnRef={efectivoBtnRef}
            creditoBtnRef={creditoBtnRef}
            payButtonRef={payButtonRef}
          />
        )}

        {/* Cartel post-cobro: opcional, no bloquea la próxima venta (se limpia solo
            apenas se arranca otra en ensureActiveSale) */}
        {!activeSale && lastPaidSale && (
          <VentaCobradaCard
            lastPaidSale={lastPaidSale}
            sendWaOpen={sendWaOpen}
            waPhone={waPhone}
            onWaPhoneChange={setWaPhone}
            onOpenSendWa={() => { setWaPhone(lastPaidSale.telefonoSugerido); setSendWaOpen(true); }}
            onDismiss={() => { setLastPaidSale(null); setSendWaOpen(false); }}
          />
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
        <VentasDelDiaModal currentSessionId={currentSession.id} onClose={() => setVentasDelDiaOpen(false)} />
      )}

      {closeModalOpen && !closeResult && (
        <CerrarCajaModal
          session={currentSession}
          closingAmount={closingAmount}
          onClosingAmountChange={setClosingAmount}
          error={closeError}
          onConfirm={() => closeSessionMutation.mutate({ id: currentSession.id, amount: parseFloat(closingAmount) })}
          closing={closeSessionMutation.isPending}
          onCancel={() => { setCloseModalOpen(false); setClosingAmount(''); setCloseError(''); }}
        />
      )}
    </div>
  );
}
