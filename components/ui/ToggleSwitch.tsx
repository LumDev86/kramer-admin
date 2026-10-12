'use client';

interface Props {
  checked: boolean;
  onChange: () => void;
  loading?: boolean;
  // nombre accesible cuando no hay un texto visible al lado (ej. "Visible en la tienda")
  label?: string;
}

export default function ToggleSwitch({ checked, onChange, loading = false, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-6.5 w-11 flex-shrink-0 cursor-pointer rounded-full border-[1.5px] border-kr-navy transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-kr-blue focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-wait ${
        checked ? 'bg-kr-green' : 'bg-kr-line'
      }`}
    >
      <span
        className={`pointer-events-none absolute top-[2px] left-[2px] inline-block h-[19px] w-[19px] rounded-full border-[1.5px] border-kr-navy bg-white transition-transform duration-200 ease-in-out ${
          checked ? 'translate-x-[18px]' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
