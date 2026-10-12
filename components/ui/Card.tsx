import type { HTMLAttributes, ReactNode } from 'react';

interface Props extends HTMLAttributes<HTMLElement> {
  // destacada = contorno marino + sombra dura (el bloque que más importa de la pantalla: cobro,
  // deuda, precio). Usarla con moderación, el resto de las tarjetas van planas.
  highlight?: boolean;
  // sin relleno interno - para listas/tablas que llegan hasta el borde
  flush?: boolean;
  as?: 'section' | 'div' | 'article' | 'aside';
}

export default function Card({ highlight, flush, as: Tag = 'section', className = '', ...rest }: Props) {
  return (
    <Tag
      className={`bg-white rounded-2xl min-w-0 ${flush ? 'overflow-hidden' : 'p-4 sm:p-5 flex flex-col gap-3'} ${
        highlight ? 'border-2 border-kr-navy shadow-pop-lg' : 'border border-kr-line'
      } ${className}`}
      {...rest}
    />
  );
}

export function CardTitle({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <h2 id={id} className={`font-display text-xl leading-tight text-kr-navy ${className}`}>
      {children}
    </h2>
  );
}
