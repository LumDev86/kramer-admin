'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { House, Package, Tag, Image, CashRegister, Truck, ChartBar, SignOut, Users, List, X, ShoppingBag, Bicycle, Lightbulb, type Icon } from '@phosphor-icons/react';
import { removeToken, getToken } from '@/lib/auth';
import { clientes, pedidos, sugerencias } from '@/lib/api';

// las secciones más usadas tienen una tecla F para entrar con una sola tecla, sin mouse. F1, F2
// y F10 no se usan acá porque ya son de Ventas (crédito, efectivo, buscar), y F11/F12 se dejan
// para el navegador (pantalla completa, herramientas de desarrollo). F5 deja de recargar la
// página (se recarga igual con Ctrl+R). Una letra sola no sirve: el lector de código de barras
// "tipea" y cambiaría de sección en medio de un escaneo.
const NAV: { href: string; label: string; icon: Icon; key?: string }[] = [
  { href: '/',              label: 'Dashboard',     icon: House        },
  { href: '/ventas',        label: 'Ventas',        icon: CashRegister, key: 'F3' },
  { href: '/pedidos',       label: 'Pedidos',       icon: ShoppingBag,  key: 'F4' },
  { href: '/reportes',      label: 'Reportes',      icon: ChartBar,     key: 'F8' },
  { href: '/productos',     label: 'Productos',     icon: Package,      key: 'F5' },
  { href: '/categorias',    label: 'Categorías',    icon: Tag,          key: 'F9' },
  { href: '/distribuidoras', label: 'Distribuidoras', icon: Truck,      key: 'F6' },
  { href: '/clientes',      label: 'Clientes',      icon: Users,        key: 'F7' },
  { href: '/repartidores',  label: 'Repartidores',  icon: Bicycle      },
  { href: '/banners',       label: 'Banners',       icon: Image        },
  { href: '/sugerencias',   label: 'Sugerencias',   icon: Lightbulb    },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { data: resetPendientes } = useQuery({
    queryKey: ['clientes', 'reset-pendientes'],
    queryFn: () => clientes.getAll({ resetPendiente: true, limit: 1 }),
    enabled: !!getToken(),
  });
  const resetPendientesCount = resetPendientes?.meta.total ?? 0;

  const { data: pedidosNuevos } = useQuery({
    queryKey: ['pedidos', 'nuevos-sidebar'],
    queryFn: () => pedidos.getAll('NUEVO'),
    enabled: !!getToken(),
    refetchInterval: 15000,
  });
  const pedidosNuevosCount = pedidosNuevos?.length ?? 0;

  // sugerencias de productos que todavía nadie revisó
  const { data: sugerenciasNuevas } = useQuery({
    queryKey: ['sugerencias', 'nuevas-sidebar'],
    queryFn: () => sugerencias.getAll({ estado: 'NUEVA', limit: 1 }),
    enabled: !!getToken(),
  });
  const sugerenciasNuevasCount = sugerenciasNuevas?.meta.total ?? 0;

  // cerrar el drawer solo al navegar (mobile) - en desktop es siempre visible y esto no afecta nada
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // tecla F -> sección (ver NAV)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;
      const item = NAV.find((n) => n.key === e.key);
      if (!item) return;
      e.preventDefault();
      router.push(item.href);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  const handleLogout = () => {
    removeToken();
    router.replace('/login');
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden print:hidden fixed top-4 left-4 z-30 w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-600"
      >
        <List size={20} weight="bold" />
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40 animate-fadeIn" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`w-60 min-h-screen bg-white border-r border-gray-100 flex flex-col fixed top-0 left-0 z-50 shadow-sm transition-transform duration-200 md:translate-x-0 print:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">Admin</p>
            <p className="text-lg font-extrabold text-gray-800 leading-tight">Kiosco Kramer</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, key }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                title={key ? `${label} (${key})` : label}
                className={`group relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-2xl border transition-all duration-200 active:scale-[0.97] ${
                  active
                    ? 'bg-orange-50 border-orange-100 shadow-sm'
                    : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100'
                }`}
              >
                {/* barra de acento - marca de un vistazo en qué sección está parado el usuario,
                    con transición suave al pasar de un ítem a otro */}
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-orange-500 transition-all duration-200 ${
                    active ? 'h-6 opacity-100' : 'h-0 opacity-0'
                  }`}
                />
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                    active
                      ? 'bg-orange-500 text-white scale-105'
                      : 'bg-gray-100 text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-500 group-hover:scale-105'
                  }`}
                >
                  <Icon size={18} weight={active ? 'fill' : 'regular'} />
                </div>
                <span className={`flex-1 text-sm font-bold transition-colors ${active ? 'text-gray-800' : 'text-gray-600 group-hover:text-gray-800'}`}>
                  {label}
                </span>
                {href === '/clientes' && resetPendientesCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {resetPendientesCount > 9 ? '9+' : resetPendientesCount}
                  </span>
                )}
                {href === '/pedidos' && pedidosNuevosCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {pedidosNuevosCount > 9 ? '9+' : pedidosNuevosCount}
                  </span>
                )}
                {href === '/sugerencias' && sugerenciasNuevasCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {sugerenciasNuevasCount > 9 ? '9+' : sugerenciasNuevasCount}
                  </span>
                )}
                {key && (
                  <kbd className="hidden md:inline text-[10px] font-semibold text-gray-300 font-sans flex-shrink-0">
                    {key}
                  </kbd>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors w-full"
          >
            <SignOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
