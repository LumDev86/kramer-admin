import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(body.error || `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface Category {
  id: string;
  name: string;
  imageUrl: string | null;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  children: { id: string; name: string; imageUrl: string | null }[];
  createdAt: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  stock: number;
  imageUrl: string;
  quantity: number | null;
  unit: string | null;
  barcode: string | null;
  cost: string | null;
  isActive: boolean;
  categoryId: string | null;
  category: Category | null;
  createdAt: string;
}

export interface Banner {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
  title: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
}

export const auth = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ id: string; email: string }>('/auth/me'),
};

export const categories = {
  getAll: (params: { page?: number; limit?: number; search?: string; parentId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page)                  qs.set('page',     String(params.page));
    if (params.limit)                 qs.set('limit',    String(params.limit));
    if (params.search)                qs.set('search',   params.search);
    if (params.parentId !== undefined) qs.set('parentId', params.parentId);
    const q = qs.toString() ? `?${qs}` : '';
    return request<PaginatedResponse<Category>>(`/categories${q}`);
  },
  getById: (id: string) => request<Category>(`/categories/${id}`),
  create:  (form: FormData) => request<Category>('/categories', { method: 'POST', body: form }),
  update:  (id: string, form: FormData) => request<Category>(`/categories/${id}`, { method: 'PUT', body: form }),
  delete:  (id: string) => request<void>(`/categories/${id}`, { method: 'DELETE' }),
};

export const products = {
  getAll: (params: { page?: number; limit?: number; search?: string; categoryId?: string; parentCategoryId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page)               qs.set('page',             String(params.page));
    if (params.limit)              qs.set('limit',            String(params.limit));
    if (params.search)             qs.set('search',           params.search);
    if (params.categoryId)         qs.set('categoryId',       params.categoryId);
    if (params.parentCategoryId)   qs.set('parentCategoryId', params.parentCategoryId);
    const q = qs.toString() ? `?${qs}` : '';
    return request<PaginatedResponse<Product>>(`/products${q}`);
  },
  getById: (id: string) => request<Product>(`/products/${id}`),
  getByBarcode: (code: string) =>
    request<Product | null>(`/products/barcode/${encodeURIComponent(code)}`).catch(() => null),
  generateUniqueBarcode: async (): Promise<string> => {
    // prefijo "20" reservado por convención para uso interno (no asignado por GS1 a fabricantes)
    for (let i = 0; i < 5; i++) {
      const code = '20' + Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
      const existing = await products.getByBarcode(code);
      if (!existing) return code;
    }
    throw new Error('No se pudo generar un código único, probá de nuevo');
  },
  create:  (form: FormData) => request<Product>('/products', { method: 'POST', body: form }),
  update:  (id: string, form: FormData) => request<Product>(`/products/${id}`, { method: 'PUT', body: form }),
  toggleActive: (id: string) => request<Product>(`/products/${id}/toggle-active`, { method: 'PATCH' }),
  delete:  (id: string) => request<void>(`/products/${id}`, { method: 'DELETE' }),
  imageSearch: (query: string) =>
    request<ImageSearchResult[]>(`/products/image-search?q=${encodeURIComponent(query)}`),
};

export interface ImageSearchResult {
  imageUrl: string;
  thumbnailUrl: string;
}

export interface StoreScheduleDay {
  dayOfWeek: number;
  isOpen: boolean;
  openHour: number;
  closeHour: number;
}

export interface StoreConfig {
  id: string;
  status: 'open' | 'busy' | 'closed' | 'auto';
  busyTime: number | null;
  whatsappNumber: string | null;
  cbu: string | null;
  alias: string | null;
  titular: string | null;
  lat: number | null;
  lng: number | null;
  updatedAt: string;
  schedule: StoreScheduleDay[];
}

export const config = {
  get: () => request<StoreConfig>('/config'),
  updateStatus: (status: string, busyTime?: number | null) =>
    request<StoreConfig>('/config/status', {
      method: 'PUT',
      body: JSON.stringify({ status, busyTime }),
    }),
  updateSchedule: (schedule: StoreScheduleDay[]) =>
    request<StoreScheduleDay[]>('/config/schedule', {
      method: 'PUT',
      body: JSON.stringify({ schedule }),
    }),
  updateContact: (data: { whatsappNumber: string; cbu: string; alias: string; titular: string }) =>
    request<StoreConfig>('/config/contact', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateUbicacion: (lat: number, lng: number) =>
    request<StoreConfig>('/config/ubicacion', { method: 'PUT', body: JSON.stringify({ lat, lng }) }),
};

export type SaleStatus = 'OPEN' | 'PAID' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CREDIT';

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string | null;
  name: string;
  unitPrice: string;
  quantity: number;
  subtotal: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  status: SaleStatus;
  paymentMethod: PaymentMethod | null;
  total: string;
  paidAmount: string | null;
  changeAmount: string | null;
  userId: string;
  cashSessionId: string | null;
  clienteId: string | null;
  items: SaleItem[];
  openedAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
}

export interface SaleWithCliente extends Sale {
  cliente: { id: string; nombre: string; apellido: string } | null;
}

export interface SaleSummary {
  total: number;
  count: number;
  byMethod: { CASH: number; TRANSFER: number; CREDIT: number };
}

export const sales = {
  getOpen: () => request<Sale[]>('/sales/open'),
  getBySession: (cashSessionId: string) => request<Sale[]>(`/sales/session/${cashSessionId}`),
  getByDate: (date: string) => request<SaleWithCliente[]>(`/sales/by-date?date=${date}`),
  getSummary: (date?: string) => request<SaleSummary>(`/sales/summary${date ? `?date=${date}` : ''}`),
  create: () => request<Sale>('/sales', { method: 'POST' }),
  addItem: (saleId: string, data: { productId?: string; name?: string; unitPrice?: number; quantity?: number }) =>
    request<Sale>(`/sales/${saleId}/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (saleId: string, itemId: string, data: { quantity?: number; unitPrice?: number }) =>
    request<Sale>(`/sales/${saleId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeItem: (saleId: string, itemId: string) =>
    request<Sale>(`/sales/${saleId}/items/${itemId}`, { method: 'DELETE' }),
  pay: (saleId: string, data: { paymentMethod: PaymentMethod; paidAmount?: number; clienteId?: string }) =>
    request<Sale>(`/sales/${saleId}/pay`, { method: 'POST', body: JSON.stringify(data) }),
  cancel: (saleId: string) => request<Sale>(`/sales/${saleId}/cancel`, { method: 'POST' }),
  getSummaryRange: (from: string, to: string) =>
    request<SaleSummary>(`/sales/summary-range?from=${from}&to=${to}`),
};

export type CashSessionStatus = 'OPEN' | 'CLOSED';

export interface CashSession {
  id: string;
  status: CashSessionStatus;
  openingAmount: string;
  closingAmount: string | null;
  expectedAmount: string | null;
  difference: string | null;
  userId: string;
  openedAt: string;
  closedAt: string | null;
}

export interface CurrentCashSession extends CashSession {
  salesTotal: number;
  salesCash: number;
  salesTransfer: number;
  salesCredit: number;
  salesCount: number;
}

export interface CategoryBreakdown {
  name: string;
  total: number;
}

export interface ProductBreakdown {
  name: string;
  quantity: number;
  total: number;
}

export interface CashSessionBreakdown {
  salesTotal: number;
  salesCash: number;
  salesTransfer: number;
  salesCredit: number;
  salesCount: number;
  profit: number;
  byCategory: CategoryBreakdown[];
  byProduct: ProductBreakdown[];
}

export const cashSessions = {
  getCurrent: () => request<CurrentCashSession | null>('/cash-sessions/current'),
  getBreakdown: (id: string) => request<CashSessionBreakdown>(`/cash-sessions/${id}/breakdown`),
  open: (openingAmount: number) =>
    request<CashSession>('/cash-sessions', { method: 'POST', body: JSON.stringify({ openingAmount }) }),
  close: (id: string, closingAmount: number) =>
    request<CashSession>(`/cash-sessions/${id}/close`, { method: 'POST', body: JSON.stringify({ closingAmount }) }),
  getHistory: (from?: string, to?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const q = qs.toString() ? `?${qs}` : '';
    return request<CashSession[]>(`/cash-sessions${q}`);
  },
};

export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  apodo: string | null;
  dni: string | null;
  telefono: string | null;
  direccion: string | null;
  email: string | null;
  creditLimit: string | null;
  isActive: boolean;
  deuda?: number;
  passwordResetRequestedAt: string | null;
  createdAt: string;
}

export interface ClientePago {
  id: string;
  clienteId: string;
  amount: string;
  note: string | null;
  createdAt: string;
}

export interface ClienteConHistorial extends Cliente {
  sales: Sale[];
  pagos: ClientePago[];
}

export const clientes = {
  getAll: (params: { page?: number; limit?: number; search?: string; resetPendiente?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (params.page)   qs.set('page',   String(params.page));
    if (params.limit)  qs.set('limit',  String(params.limit));
    if (params.search) qs.set('search', params.search);
    if (params.resetPendiente) qs.set('resetPendiente', 'true');
    const q = qs.toString() ? `?${qs}` : '';
    return request<PaginatedResponse<Cliente>>(`/clientes${q}`);
  },
  getById: (id: string) => request<ClienteConHistorial>(`/clientes/${id}`),
  create: (data: {
    nombre: string;
    apellido: string;
    apodo?: string;
    dni?: string;
    telefono?: string;
    direccion?: string;
    email?: string;
    creditLimit?: number;
  }) => request<Cliente>('/clientes', { method: 'POST', body: JSON.stringify(data) }),
  update: (
    id: string,
    data: {
      nombre?: string;
      apellido?: string;
      apodo?: string | null;
      dni?: string | null;
      telefono?: string | null;
      direccion?: string | null;
      email?: string | null;
      creditLimit?: number | null;
    }
  ) => request<Cliente>(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleActive: (id: string) => request<Cliente>(`/clientes/${id}/toggle-active`, { method: 'PATCH' }),
  registerPago: (id: string, data: { amount: number; note?: string }) =>
    request<ClientePago>(`/clientes/${id}/pagos`, { method: 'POST', body: JSON.stringify(data) }),
  generarRecupero: (id: string) =>
    request<{ url: string; expiresAt: string }>(`/clientes/${id}/generar-recupero`, { method: 'POST' }),
};

export interface Distribuidor {
  id: string;
  nombre: string;
  telefono: string | null;
  notas: string | null;
  totalGastado?: number;
  createdAt: string;
}

export type FacturaStatus = 'PENDING_REVIEW' | 'CONFIRMED' | 'CANCELLED';

export interface FacturaItem {
  id: string;
  facturaId: string;
  productId: string | null;
  product: {
    id: string;
    title: string;
    price: string;
    cost: string | null;
    imageUrl: string;
  } | null;
  nombreDetectado: string;
  codigoDetectado: string | null;
  codigoArticuloDetectado: string | null;
  cantidad: number;
  precioUnitario: string;
  medidaDetectada: number | null;
  medidaUnidadDetectada: string | null;
  unidadesPorBultoDetectada: number | null;
  alicuotaIvaDetectada: number | null;
  subtotal: string;
  createdAt: string;
}

export interface SuggestedProduct {
  id: string;
  title: string;
  price: string;
  cost: string | null;
  imageUrl: string;
  quantity: number | null;
  unit: string | null;
}

export interface Factura {
  id: string;
  distribuidorId: string;
  imageUrl: string | null;
  status: FacturaStatus;
  total: string;
  extractionError: string | null;
  items: FacturaItem[];
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
}

export interface DistribuidorConFacturas extends Distribuidor {
  facturas: Factura[];
}

export interface ProductoDistribuidor {
  id: string;
  title: string;
  cost: string | null;
  price: string;
  imageUrl: string;
}

export interface ProductoAjustado {
  id: string;
  title: string;
  costAnterior: string | null;
  costNuevo: string | null;
  precioAnterior: string;
  precioNuevo: string;
}

export const distribuidores = {
  getAll: () => request<Distribuidor[]>('/distribuidores'),
  getById: (id: string) => request<DistribuidorConFacturas>(`/distribuidores/${id}`),
  create: (data: { nombre: string; telefono?: string; notas?: string }) =>
    request<Distribuidor>('/distribuidores', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { nombre?: string; telefono?: string | null; notas?: string | null }) =>
    request<Distribuidor>(`/distribuidores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/distribuidores/${id}`, { method: 'DELETE' }),
  getProductos: (id: string) => request<ProductoDistribuidor[]>(`/distribuidores/${id}/productos`),
  aplicarAumento: (id: string, data: { pct: number; productIds: string[] }) =>
    request<ProductoAjustado[]>(`/distribuidores/${id}/aplicar-aumento`, { method: 'POST', body: JSON.stringify(data) }),
};

export const facturas = {
  getById: (id: string) => request<Factura>(`/facturas/${id}`),
  getSuggestions: (facturaId: string) =>
    request<Record<string, SuggestedProduct[]>>(`/facturas/${facturaId}/suggestions`),
  create: (distribuidorId: string, form: FormData) =>
    request<Factura>(`/distribuidores/${distribuidorId}/facturas`, { method: 'POST', body: form }),
  addItem: (
    facturaId: string,
    data: { productId?: string; nombreDetectado: string; codigoDetectado?: string; cantidad?: number; precioUnitario: number }
  ) => request<Factura>(`/facturas/${facturaId}/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (
    facturaId: string,
    itemId: string,
    data: { productId?: string | null; nombreDetectado?: string; codigoDetectado?: string | null; cantidad?: number; precioUnitario?: number }
  ) => request<Factura>(`/facturas/${facturaId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeItem: (facturaId: string, itemId: string) =>
    request<Factura>(`/facturas/${facturaId}/items/${itemId}`, { method: 'DELETE' }),
  createProductFromItem: (facturaId: string, itemId: string, form: FormData) =>
    request<Factura>(`/facturas/${facturaId}/items/${itemId}/product`, { method: 'POST', body: form }),
  confirm: (facturaId: string) => request<Factura>(`/facturas/${facturaId}/confirm`, { method: 'POST' }),
  cancel: (facturaId: string) => request<Factura>(`/facturas/${facturaId}/cancel`, { method: 'POST' }),
};

export const banners = {
  getAll: () => request<Banner[]>('/banners?all=true'),
  getById: (id: string) => request<Banner>(`/banners/${id}`),
  create:  (form: FormData) => request<Banner>('/banners', { method: 'POST', body: form }),
  update:  (id: string, form: FormData) => request<Banner>(`/banners/${id}`, { method: 'PUT', body: form }),
  delete:  (id: string) => request<void>(`/banners/${id}`, { method: 'DELETE' }),
};

export type TipoPeriodo = 'dia' | 'semana' | 'mes' | 'anio';

export interface ProductoReporte {
  productId: string | null;
  name: string;
  quantity: number;
  total: number;
  profit: number;
}

export interface FacturaResumenReporte {
  id: string;
  distribuidorId: string;
  distribuidorNombre: string;
  total: number;
  confirmedAt: string | null;
}

export interface DistribuidorGastoReporte {
  distribuidorId: string;
  nombre: string;
  total: number;
  facturasCount: number;
}

export interface ProductoAumentadoReporte {
  productId: string;
  title: string;
  precioAnterior: number;
  precioNuevo: number;
  pct: number;
}

export interface Reporte {
  periodo: { tipo: TipoPeriodo; desde: string; hasta: string };
  ventas: {
    total: number;
    count: number;
    byMethod: { CASH: number; TRANSFER: number; CREDIT: number };
    ticketPromedio: number;
    variacionPct: number | null;
  };
  ganancia: {
    total: number;
    margenPct: number;
    variacionPct: number | null;
  };
  perdidas: { faltantesCaja: number; turnosConFaltante: number };
  ventasPorCategoria: { name: string; total: number }[];
  productosMasVendidos: ProductoReporte[];
  productosMasRentables: { productId: string | null; name: string; profit: number }[];
  distribuidoras: {
    totalGastado: number;
    porDistribuidora: DistribuidorGastoReporte[];
    facturas: FacturaResumenReporte[];
  };
  productosConAumento: ProductoAumentadoReporte[];
  fiado: { otorgado: number; cobrado: number };
  cortesDeCaja: CashSession[];
}

export const reportes = {
  getReporte: (tipo: TipoPeriodo, fecha?: string) => {
    const qs = new URLSearchParams({ tipo });
    if (fecha) qs.set('fecha', fecha);
    return request<Reporte>(`/reportes?${qs}`);
  },
};

export type PedidoStatus = 'NUEVO' | 'EN_PREPARACION' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO';

export interface PedidoItem {
  id: string;
  pedidoId: string;
  productId: string | null;
  name: string;
  unitPrice: string;
  quantity: number;
  subtotal: string;
}

export interface Repartidor {
  id: string;
  negocioId: string;
  nombre: string;
  telefono: string;
  isActive: boolean;
  conectado: boolean;
  lat: number | null;
  lng: number | null;
  ubicacionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pedido {
  id: string;
  negocioId: string;
  numero: string;
  status: PedidoStatus;
  nombreCliente: string;
  telefonoCliente: string;
  direccion: string;
  notas: string | null;
  paymentMethod: 'CASH' | 'TRANSFER';
  total: string;
  distanciaKm: number | null;
  cruzaVias: boolean | null;
  destinoLat: number | null;
  destinoLng: number | null;
  items: PedidoItem[];
  repartidorId: string | null;
  repartidor: { id: string; nombre: string; telefono: string } | null;
  saleId: string | null;
  trackingToken: string;
  createdAt: string;
  enPreparacionAt: string | null;
  enCaminoAt: string | null;
  entregadoAt: string | null;
  canceladoAt: string | null;
}

export const pedidos = {
  getAll: (status?: PedidoStatus, fecha?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (fecha) params.set('fecha', fecha);
    const qs = params.toString();
    return request<Pedido[]>(`/pedidos${qs ? `?${qs}` : ''}`);
  },
  getById: (id: string) => request<Pedido>(`/pedidos/${id}`),
  asignar: (id: string, repartidorId: string) =>
    request<Pedido>(`/pedidos/${id}/asignar`, { method: 'PATCH', body: JSON.stringify({ repartidorId }) }),
  actualizarEstado: (id: string, status: PedidoStatus) =>
    request<Pedido>(`/pedidos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  cancelar: (id: string) => request<Pedido>(`/pedidos/${id}/cancelar`, { method: 'POST' }),
};

export const repartidores = {
  getAll: () => request<Repartidor[]>('/repartidores'),
  toggleActive: (id: string) => request<Repartidor>(`/repartidores/${id}/toggle-active`, { method: 'PATCH' }),
};

export const push = {
  getPublicKey: () => request<{ publicKey: string }>('/push/public-key'),
  subscribe: (subscription: PushSubscriptionJSON) =>
    request<{ ok: true }>('/push/subscribe', { method: 'POST', body: JSON.stringify(subscription) }),
};
