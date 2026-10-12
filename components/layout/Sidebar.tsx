'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { GearSix, Package, Tag, Image as ImageIcon, CashRegister, Truck, ChartBar, SignOut, Users, List, X, ShoppingBag, Bicycle, Lightbulb, DotsThreeOutline, type Icon } from '@phosphor-icons/react';
import { removeToken, getToken } from '@/lib/auth';
import { clientes, pedidos, sugerencias } from '@/lib/api';

// las secciones más usadas tienen una tecla F para entrar con una sola tecla, sin mouse. F1, F2
// y F10 no se usan acá porque ya son de Ventas (crédito, efectivo, buscar), y F11/F12 se dejan
// para el navegador (pantalla completa, herramientas de desarrollo). F5 deja de recargar la
// página (se recarga igual con Ctrl+R). Una letra sola no sirve: el lector de código de barras
// "tipea" y cambiaría de sección en medio de un escaneo.
const NAV: { href: string; label: string; icon: Icon; key?: string }[] = [
  { href: '/',              label: 'Configuración', icon: GearSix      },
  { href: '/ventas',        label: 'Ventas',        icon: CashRegister, key: 'F3' },
  { href: '/pedidos',       label: 'Pedidos',       icon: ShoppingBag,  key: 'F4' },
  { href: '/reportes',      label: 'Reportes',      icon: ChartBar,     key: 'F8' },
  { href: '/productos',     label: 'Productos',     icon: Package,      key: 'F5' },
  { href: '/categorias',    label: 'Categorías',    icon: Tag,          key: 'F9' },
  { href: '/distribuidoras', label: 'Distribuidoras', icon: Truck,      key: 'F6' },
  { href: '/clientes',      label: 'Clientes',      icon: Users,        key: 'F7' },
  { href: '/repartidores',  label: 'Repartidores',  icon: Bicycle      },
  { href: '/banners',       label: 'Banners',       icon: ImageIcon    },
  { href: '/sugerencias',   label: 'Sugerencias',   icon: Lightbulb    },
];

// barra de abajo en el celular: lo que se usa en el día a día; el resto queda en "Más"
const BOTTOM = ['/ventas', '/pedidos', '/productos', '/clientes'];

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

  const badgeFor = (href: string) =>
    href === '/pedidos' ? pedidosNuevosCount
      : href === '/clientes' ? resetPendientesCount
      : href === '/sugerencias' ? sugerenciasNuevasCount
      : 0;

  // cerrar el menú del celular al navegar
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

  const current = NAV.find((n) => isActive(n.href));
  const inBottom = BOTTOM.some((h) => isActive(h));

  return (
    <>
      {/* ---- escritorio (lateral completo) y tablet (columna de íconos) ---- */}
      <aside className="hidden md:flex fixed top-0 left-0 z-40 h-screen w-[72px] lg:w-60 flex-col gap-4 overflow-y-auto bg-kr-navy px-2 lg:px-3 py-4 print:hidden">
        <Brand compact />
        <NavList items={NAV} isActive={isActive} badgeFor={badgeFor} rail />
        <LogoutButton onClick={handleLogout} rail />
      </aside>

      {/* ---- celular: barra de arriba ---- */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex h-[60px] items-center gap-2 bg-kr-navy px-2.5 text-white print:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menú" className="flex h-11 w-11 items-center justify-center rounded-xl">
          <List size={24} weight="bold" />
        </button>
        <span className="font-display text-[21px] leading-none truncate">{current?.label ?? 'Kiosco Kramer'}</span>
      </header>

      {/* ---- celular: barra de abajo ---- */}
      <nav aria-label="Accesos rápidos" className="md:hidden fixed bottom-0 inset-x-0 z-40 flex h-16 border-t-[1.5px] border-kr-line bg-white print:hidden">
        {BOTTOM.map((href) => {
          const item = NAV.find((n) => n.href === href)!;
          return (
            <BottomItem key={href} href={href} label={item.label} icon={item.icon} active={isActive(href)} badge={badgeFor(href)} />
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold ${!inBottom ? 'text-kr-navy' : 'text-kr-muted'}`}
        >
          <span className={`flex items-center justify-center rounded-[10px] px-3 py-0.5 ${!inBottom ? 'bg-kr-yellow border-[1.5px] border-kr-navy' : 'border-[1.5px] border-transparent'}`}>
            <DotsThreeOutline size={22} weight={!inBottom ? 'fill' : 'regular'} />
          </span>
          Más
        </button>
      </nav>

      {/* ---- celular: menú completo ---- */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 print:hidden">
          <div className="absolute inset-0 bg-kr-navy/50 animate-fadeIn" onClick={() => setOpen(false)} />
          <aside className="absolute top-0 left-0 flex h-full w-72 max-w-[85vw] flex-col gap-4 overflow-y-auto bg-kr-navy px-3 py-4 animate-slideUp">
            <div className="flex items-start justify-between gap-2">
              <Brand />
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar menú" className="flex h-11 w-11 items-center justify-center rounded-xl text-kr-side-text">
                <X size={22} weight="bold" />
              </button>
            </div>
            <NavList items={NAV} isActive={isActive} badgeFor={badgeFor} />
            <LogoutButton onClick={handleLogout} />
          </aside>
        </div>
      )}
    </>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 px-1 ${compact ? 'justify-center lg:justify-start' : ''}`}>
      <span className="relative h-11 w-11 flex-shrink-0 -rotate-6 rounded-xl border-2 border-kr-yellow bg-white p-0.5">
        <Image src="/logo.png" alt="Kiosco Kramer" fill sizes="44px" className="object-contain p-0.5" unoptimized />
      </span>
      <span className={`flex-col leading-tight text-white ${compact ? 'hidden lg:flex' : 'flex'}`}>
        <span className="font-display text-[19px]">Kiosco Kramer</span>
        <span className="text-xs font-bold text-kr-side-text">Panel de administración</span>
      </span>
    </div>
  );
}

function NavList({ items, isActive, badgeFor, rail }: {
  items: typeof NAV;
  isActive: (href: string) => boolean;
  badgeFor: (href: string) => number;
  // en tablet el menú es una columna de íconos: el texto se oculta hasta lg
  rail?: boolean;
}) {
  return (
    <nav aria-label="Secciones" className="flex flex-1 flex-col gap-1">
      {items.map(({ href, label, icon: Icon, key }) => {
        const active = isActive(href);
        const badge = badgeFor(href);
        return (
          <Link
            key={href}
            href={href}
            title={key ? `${label} (${key})` : label}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={`relative flex min-h-10 items-center gap-3 rounded-xl border-2 text-sm font-bold transition-colors ${
              rail ? 'justify-center px-0 lg:justify-start lg:px-3' : 'px-3'
            } ${
              active
                ? 'border-kr-navy-dark bg-kr-yellow text-kr-navy shadow-[2px_2px_0_0_#0A1230]'
                : 'border-transparent text-kr-side-text hover:bg-white/[0.07] hover:text-white'
            }`}
          >
            <Icon size={20} weight={active ? 'fill' : 'regular'} className="flex-shrink-0" />
            <span className={`flex-1 ${rail ? 'hidden lg:inline' : ''}`}>{label}</span>
            {badge > 0 && (
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-kr-orange px-1.5 text-[11px] font-extrabold text-kr-navy ${
                  rail ? 'absolute -top-1 -right-1 lg:static' : ''
                }`}
              >
                {badge > 9 ? '9+' : badge}
              </span>
            )}
            {key && badge === 0 && (
              <kbd className={`font-sans text-[11px] font-bold opacity-60 ${rail ? 'hidden lg:inline' : 'hidden'}`}>{key}</kbd>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function LogoutButton({ onClick, rail }: { onClick: () => void; rail?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Cerrar sesión"
      aria-label="Cerrar sesión"
      className={`flex min-h-11 items-center gap-3 rounded-xl text-sm font-bold text-kr-side-text transition-colors hover:bg-white/[0.07] hover:text-white ${
        rail ? 'justify-center lg:justify-start lg:px-3' : 'px-3'
      }`}
    >
      <SignOut size={20} />
      <span className={rail ? 'hidden lg:inline' : ''}>Cerrar sesión</span>
    </button>
  );
}

function BottomItem({ href, label, icon: Icon, active, badge }: { href: string; label: string; icon: Icon; active: boolean; badge: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold ${active ? 'text-kr-navy' : 'text-kr-muted'}`}
    >
      <span className={`flex items-center justify-center rounded-[10px] px-3 py-0.5 ${active ? 'bg-kr-yellow border-[1.5px] border-kr-navy' : 'border-[1.5px] border-transparent'}`}>
        <Icon size={22} weight={active ? 'fill' : 'regular'} />
      </span>
      {label}
      {badge > 0 && (
        <span className="absolute top-1 right-[calc(50%-24px)] flex h-5 min-w-5 items-center justify-center rounded-full bg-kr-orange px-1 text-[11px] font-extrabold text-kr-navy">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}
