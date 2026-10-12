import Link from 'next/link';
import type { ReactNode } from 'react';
import { CaretLeft } from '@phosphor-icons/react/dist/ssr';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  // link "volver" arriba del título (pantallas de detalle)
  back?: { href: string; label: string };
  // chips de estado al lado del título
  badges?: ReactNode;
  // botones a la derecha (en celular bajan debajo del título)
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, back, badges, actions }: Props) {
  return (
    <header className="flex flex-col gap-2 print:hidden">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1.5 self-start min-h-8 text-sm font-extrabold text-kr-muted hover:text-kr-navy">
          <CaretLeft size={16} weight="bold" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex flex-col gap-1 min-w-0 mr-auto">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="font-display text-[28px] md:text-[34px] leading-none text-kr-navy">{title}</h1>
            {badges}
          </div>
          {subtitle && <p className="text-sm font-bold text-kr-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
