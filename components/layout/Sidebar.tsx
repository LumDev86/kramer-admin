'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { House, Package, Tag, Image, Receipt, Truck, ChartBar, SignOut, Users, List, X, ShoppingBag, Bicycle } from '@phosphor-icons/react';
import { removeToken, getToken } from '@/lib/auth';
import { clientes, pedidos } from '@/lib/api';
import { startAlarm, notifyNewPedido } from '@/lib/notificationSound';

const NAV = [
  { href: '/',              label: 'Dashboard',     icon: House    },
  { href: '/ventas',        label: 'Ventas',        icon: Receipt  },
  { href: '/pedidos',       label: 'Pedidos',       icon: ShoppingBag },
  { href: '/reportes',      label: 'Reportes',      icon: ChartBar },
  { href: '/productos',     label: 'Productos',     icon: Package  },
  { href: '/categorias',    label: 'Categorías',    icon: Tag      },
  { href: '/distribuidoras', label: 'Distribuidoras', icon: Truck  },
  { href: '/clientes',      label: 'Clientes',      icon: Users    },
  { href: '/repartidores',  label: 'Repartidores',  icon: Bicycle  },
  { href: '/banners',       label: 'Banners',       icon: Image    },
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

  // set de ids ya vistos para detectar específicamente pedidos NUEVOS que aparecieron entre
  // un polling y otro (no solo "el conteo subió" - un pedido puede salir de NUEVO al mismo
  // tiempo que entra otro, y ahí el conteo no cambia pero sí hay que avisar).
  const pedidosVistos = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!pedidosNuevos) return;
    const idsActuales = new Set(pedidosNuevos.map((p) => p.id));

    // primera carga: solo registra los que ya estaban, no suena por pedidos previos a abrir el panel
    if (pedidosVistos.current === null) {
      pedidosVistos.current = idsActuales;
      return;
    }

    const nuevos = pedidosNuevos.filter((p) => !pedidosVistos.current!.has(p.id));
    if (nuevos.length > 0) {
      startAlarm();
      notifyNewPedido(nuevos[0].numero, nuevos[0].nombreCliente);
    }
    pedidosVistos.current = idsActuales;
  }, [pedidosNuevos]);

  // cerrar el drawer solo al navegar (mobile) - en desktop es siempre visible y esto no afecta nada
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive(href)
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <Icon size={18} weight={isActive(href) ? 'fill' : 'regular'} />
              <span className="flex-1">{label}</span>
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
            </Link>
          ))}
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
