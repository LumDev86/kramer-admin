import type { ReactNode } from 'react';

export type ChipTone = 'neutral' | 'ok' | 'warn' | 'info' | 'off' | 'bad';

const TONES: Record<ChipTone, string> = {
  neutral: 'bg-kr-sand text-kr-navy',
  ok: 'bg-kr-green-soft text-kr-green-dark',
  warn: 'bg-kr-yellow-soft text-kr-navy border-[1.5px] border-kr-navy',
  info: 'bg-kr-blue-soft text-kr-blue',
  off: 'bg-[#EEE9DE] text-kr-muted',
  bad: 'bg-[#FFE7D6] text-kr-orange-dark',
};

export default function Chip({ tone = 'neutral', children, className = '' }: { tone?: ChipTone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold whitespace-nowrap ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
