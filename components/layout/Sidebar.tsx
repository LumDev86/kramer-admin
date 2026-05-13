'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { House, Package, Tag, Image, SignOut } from '@phosphor-icons/react';
import { removeToken } from '@/lib/auth';

const NAV = [
  { href: '/',           label: 'Dashboard',  icon: House   },
  { href: '/productos',  label: 'Productos',  icon: Package },
  { href: '/categorias', label: 'Categorías', icon: Tag     },
  { href: '/banners',    label: 'Banners',    icon: Image   },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    removeToken();
    router.replace('/login');
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-100 flex flex-col fixed top-0 left-0 z-40 shadow-sm">
      <div className="px-5 py-6 border-b border-gray-100">
        <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">Admin</p>
        <p className="text-lg font-extrabold text-gray-800 leading-tight">Kiosco Kramer</p>
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
            {label}
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
  );
}
