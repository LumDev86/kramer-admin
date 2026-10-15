'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Cliente, clientes } from '@/lib/api';
import Card from '@/components/ui/Card';
import Field, { inputClasses } from '@/components/ui/Field';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

// límite con el que arranca un cliente nuevo (el mismo que se les pone a los que se registran
// solos en la tienda, ver server cliente.service.ts LIMITE_CREDITO_INICIAL). El dueño lo puede cambiar
const LIMITE_CREDITO_INICIAL = '10000';

interface Props {
  cliente?: Cliente;
}

export default function ClienteForm({ cliente }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const isEdit = !!cliente;

  const [nombre, setNombre] = useState(cliente?.nombre ?? '');
  const [apellido, setApellido] = useState(cliente?.apellido ?? '');
  const [apodo, setApodo] = useState(cliente?.apodo ?? '');
  const [dni, setDni] = useState(cliente?.dni ?? '');
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '');
  const [direccion, setDireccion] = useState(cliente?.direccion ?? '');
  const [email, setEmail] = useState(cliente?.email ?? '');
  const [creditLimit, setCreditLimit] = useState<string>(cliente ? (cliente.creditLimit ?? '') : LIMITE_CREDITO_INICIAL);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let destinoId = cliente?.id;
      if (isEdit) {
        await clientes.update(cliente.id, {
          nombre,
          apellido,
          apodo: apodo || null,
          dni: dni || null,
          telefono: telefono || null,
          direccion: direccion || null,
          email: email || null,
          creditLimit: parseFloat(String(creditLimit)),
        });
      } else {
        const nuevo = await clientes.create({
          nombre,
          apellido,
          ...(apodo && { apodo }),
          dni,
          telefono,
          direccion,
          email,
          creditLimit: parseFloat(String(creditLimit)),
        });
        destinoId = nuevo.id;
      }
      qc.invalidateQueries({ queryKey: ['clientes'] });
      if (cliente) qc.invalidateQueries({ queryKey: ['cliente', cliente.id] });
      toast.show(isEdit ? 'Cambios guardados' : 'Cliente creado');
      router.push(destinoId ? `/clientes/${destinoId}` : '/clientes');
    } catch (err: any) {
      toast.show(err.message ?? 'Error al guardar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const campo = (id: string, label: string, value: string, set: (v: string) => void, extra: { placeholder?: string; type?: string; required?: boolean; inputMode?: 'numeric' | 'tel' | 'email'; pattern?: string; title?: string } = {}) => (
    <Field label={label} htmlFor={id}>
      <input
        id={id}
        type={extra.type ?? 'text'}
        required={extra.required}
        inputMode={extra.inputMode}
        pattern={extra.pattern}
        title={extra.title}
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={extra.placeholder}
        className={inputClasses()}
      />
    </Field>
  );

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <Card className="gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {campo('cf-nombre', 'Nombre', nombre, setNombre, { required: true, placeholder: 'Nombre' })}
          {campo('cf-apellido', 'Apellido', apellido, setApellido, { required: true, placeholder: 'Apellido' })}
          {campo('cf-apodo', 'Apodo (opcional)', apodo, setApodo, { placeholder: 'Como le dicen' })}
          {campo('cf-dni', 'DNI', dni, setDni, { required: true, placeholder: '30123456', inputMode: 'numeric', pattern: '[0-9. ]{7,12}', title: 'Solo números (7 a 9)' })}
          {campo('cf-tel', 'Teléfono', telefono, setTelefono, { required: true, placeholder: '11-1234-5678', type: 'tel', inputMode: 'tel' })}
          {campo('cf-email', 'Email', email, setEmail, { required: true, placeholder: 'cliente@ejemplo.com', type: 'email', inputMode: 'email' })}
        </div>
        {campo('cf-dir', 'Dirección', direccion, setDireccion, { required: true, placeholder: 'Domicilio' })}

        <p className="rounded-xl bg-kr-paper px-3 py-2.5 text-[13px] font-bold text-kr-muted">
          Cargarlo acá no le da acceso a la tienda. Para que vea su cuenta desde el celular, cargale el email y en su
          ficha tocá «Generar link de acceso»: con ese link elige su contraseña.
        </p>

        <Field
          label="Límite de crédito"
          htmlFor="cf-limite"
          hint="Lo define el dueño. Un cliente nuevo arranca con $10.000; si pide más, se cambia acá. No se le va a poder cobrar un fiado que haga pasar su deuda de este monto."
        >
          <input
            id="cf-limite"
            required
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            placeholder="Ej. 20000"
            className={inputClasses('no-spin')}
          />
        </Field>

        <div className="flex gap-2.5 pt-1">
          <span className="flex-1" />
          <button type="button" onClick={() => router.back()} className={buttonClasses('secondary', 'md')}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} className={buttonClasses('primary', 'md', 'min-w-36')}>
            {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </Card>
    </form>
  );
}
