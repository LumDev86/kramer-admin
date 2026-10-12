import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  // marino (totales de factura) o crema (acciones de un formulario/detalle)
  tone?: 'cream' | 'navy';
  className?: string;
}

// barra pegada abajo con la acción principal de la pantalla, para que no quede escondida al
// final de un formulario largo. En celular queda arriba de la barra de navegación.
export default function StickyActionBar({ children, tone = 'cream', className = '' }: Props) {
  return (
    <div
      className={`sticky bottom-16 md:bottom-0 z-20 -mx-4 sm:-mx-6 md:-mx-8 mt-auto flex flex-wrap items-center gap-2.5 px-4 sm:px-6 md:px-8 py-3 print:hidden ${
        tone === 'navy' ? 'bg-kr-navy text-white' : 'bg-kr-cream border-t-[1.5px] border-kr-line'
      } ${className}`}
    >
      {children}
    </div>
  );
}
