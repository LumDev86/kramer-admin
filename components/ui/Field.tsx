import type { ReactNode } from 'react';

// mismo look para todos los inputs/textarea/select de los formularios
export function inputClasses(extra = '') {
  return `box-border min-h-11 w-full min-w-0 rounded-xl border-[1.5px] border-kr-line bg-kr-paper px-3 py-2.5 text-[15px] font-bold text-kr-navy outline-none placeholder:font-semibold placeholder:text-kr-muted/70 focus:border-kr-blue disabled:opacity-50 ${extra}`;
}

interface Props {
  label: ReactNode;
  // id del control, para que tocar la etiqueta lo enfoque
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

// etiqueta + control + ayuda. Va con <label htmlFor> y no envolviendo, porque algunos controles
// (CategorySelector, UnitSelector) son botones que se abren y no quieren recibir el clic de la etiqueta
export default function Field({ label, htmlFor, hint, children, className = '' }: Props) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-[13px] font-extrabold text-kr-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs font-bold text-kr-muted">{hint}</p>}
    </div>
  );
}
