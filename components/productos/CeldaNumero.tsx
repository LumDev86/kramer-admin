'use client';

interface Props {
  // '' = vacío (por ejemplo, producto sin costo cargado)
  value: string;
  label: string;
  // devuelve false si el valor no sirve: el input vuelve a mostrar el valor anterior
  onCommit: (raw: string) => boolean | void;
  disabled?: boolean;
  prefix?: string;
  suffix?: string;
  step?: string;
  className?: string;
}

// número editable dentro de una fila del listado: se guarda al salir del campo o con Enter,
// Escape descarta lo tipeado. El subrayado punteado avisa que se puede tocar.
export default function CeldaNumero({ value, label, onCommit, disabled, prefix, suffix, step = '0.01', className = '' }: Props) {
  return (
    <span className={`inline-flex items-baseline gap-0.5 border-b-[1.5px] border-dashed border-[#B9AE97] focus-within:border-solid focus-within:border-kr-blue ${disabled ? 'opacity-50' : ''} ${className}`}>
      {prefix && <span className="font-extrabold">{prefix}</span>}
      <input
        // el key fuerza a releer el valor cuando llega uno nuevo del server
        key={value}
        type="number"
        inputMode="decimal"
        step={step}
        defaultValue={value}
        placeholder="—"
        aria-label={label}
        disabled={disabled}
        // del ancho del número, así el "$" y el "%" quedan pegados
        style={{ width: `${Math.max(value.length, 2) + 2}ch` }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            e.currentTarget.value = value;
            e.currentTarget.blur();
          }
        }}
        onBlur={(e) => {
          if (e.target.value === value) return;
          if (onCommit(e.target.value) === false) e.target.value = value;
        }}
        className="no-spin min-w-[3ch] max-w-full bg-transparent py-0.5 font-extrabold tabular-nums text-inherit outline-none placeholder:text-kr-muted md:text-right"
      />
      {suffix && <span className="font-extrabold">{suffix}</span>}
    </span>
  );
}
