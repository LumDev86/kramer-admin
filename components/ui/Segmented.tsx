'use client';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface Props<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  // ocupa todo el ancho y reparte los botones (útil en celular)
  full?: boolean;
  className?: string;
}

// control de "una opción entre pocas" (período, vista, filtro por estado)
export default function Segmented<T extends string>({ options, value, onChange, ariaLabel, full, className = '' }: Props<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`box-border inline-flex max-w-full gap-1 overflow-x-auto rounded-[14px] border-[1.5px] border-kr-line bg-white p-1 ${full ? 'w-full' : ''} ${className}`}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`inline-flex min-h-9.5 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] px-3.5 text-sm font-extrabold transition-colors ${
              full ? 'flex-1' : ''
            } ${on ? 'bg-kr-navy text-white' : 'text-kr-muted hover:text-kr-navy'}`}
          >
            {o.label}
            {o.count !== undefined && (
              <span className="rounded-lg bg-kr-yellow px-1.5 text-xs text-kr-navy">{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
