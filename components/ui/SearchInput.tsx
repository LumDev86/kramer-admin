'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

const SearchInput = forwardRef<HTMLInputElement, Props>(function SearchInput({ label, className = '', ...rest }, ref) {
  return (
    <label className={`box-border flex min-h-11 min-w-0 flex-1 basis-56 items-center gap-2 rounded-xl border-[1.5px] border-kr-line bg-white px-3 focus-within:border-kr-blue ${className}`}>
      <MagnifyingGlass size={18} weight="bold" className="flex-shrink-0 text-kr-muted" />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent text-[15px] font-bold text-kr-navy outline-none placeholder:text-kr-muted/80"
        {...rest}
      />
    </label>
  );
});

export default SearchInput;
