'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { auth } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { LockKey, EnvelopeSimple } from '@phosphor-icons/react';
import { buttonClasses } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await auth.login(email, password);
      setToken(token);
      router.replace('/');
    } catch (err: any) {
      setError(err.message ?? 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const campo = 'flex min-h-12 items-center gap-2.5 rounded-xl border-[1.5px] border-kr-line bg-kr-paper px-3 focus-within:border-kr-blue';
  const input = 'min-w-0 flex-1 bg-transparent text-[15px] font-bold text-kr-navy outline-none placeholder:font-semibold placeholder:text-kr-muted/70';

  return (
    <div className="flex min-h-screen items-center justify-center bg-kr-navy px-4 py-10">
      <div className="w-full max-w-sm animate-slideUp">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="relative h-20 w-20 overflow-hidden rounded-2xl border-2 border-kr-yellow bg-white shadow-[4px_4px_0_0_var(--color-kr-yellow)]">
            <Image src="/logo.png" alt="" fill sizes="80px" className="object-contain p-1.5" priority />
          </span>
          <div>
            <h1 className="font-display text-3xl leading-none text-white">Kiosco Kramer</h1>
            <p className="mt-1 text-sm font-bold text-kr-side-text">Panel de administración</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border-2 border-kr-navy bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-[13px] font-extrabold text-kr-muted">Email</label>
            <div className={campo}>
              <EnvelopeSimple size={18} weight="bold" className="flex-shrink-0 text-kr-muted" />
              <input
                id="login-email"
                required
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kramer.com"
                className={input}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-pass" className="text-[13px] font-extrabold text-kr-muted">Contraseña</label>
            <div className={campo}>
              <LockKey size={18} weight="bold" className="flex-shrink-0 text-kr-muted" />
              <input
                id="login-pass"
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={input}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-[#FFE7D6] px-3 py-2 text-sm font-bold text-kr-orange-dark">{error}</p>
          )}

          <button type="submit" disabled={loading} className={buttonClasses('primary', 'lg', 'mt-1 w-full')}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
