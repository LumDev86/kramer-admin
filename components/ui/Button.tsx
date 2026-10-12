'use client';

import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'success' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  // amarillo con contorno y sombra dura - la acción principal de la pantalla (una sola por vista)
  primary: 'bg-kr-yellow text-kr-navy border-2 border-kr-navy shadow-pop pop-press',
  // confirmar algo que mueve plata (Cobrar, Confirmar factura)
  success: 'bg-kr-green text-kr-navy border-2 border-kr-navy shadow-pop pop-press',
  secondary: 'bg-white text-kr-navy border-[1.5px] border-kr-line hover:border-kr-navy/40',
  danger: 'bg-white text-kr-orange-dark border-[1.5px] border-kr-line hover:border-kr-orange-dark/50',
  ghost: 'bg-transparent text-kr-navy border-[1.5px] border-transparent hover:bg-kr-sand',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-[13px] rounded-[10px]',
  md: 'min-h-11 px-4 text-sm rounded-xl',
  lg: 'min-h-13 px-5 text-base rounded-xl',
};

// las clases sueltas sirven para darle cara de botón a un <Link> sin duplicar estilos
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = '') {
  return `box-border inline-flex items-center justify-center gap-2 font-extrabold leading-tight text-center max-w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export default function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }: Props) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...rest} />;
}
