'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Distribuidor, distribuidores } from '@/lib/api';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import Card from '@/components/ui/Card';
import Field, { inputClasses } from '@/components/ui/Field';
import ConfirmModal from '@/components/ui/ConfirmModal';
import AjustarIvaModal from '@/components/ui/AjustarIvaModal';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface Props {
  distribuidor?: Distribuidor;
}

export default function DistribuidorForm({ distribuidor }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const isEdit = !!distribuidor;

  const [nombre, setNombre] = useState(distribuidor?.nombre ?? '');
  const [telefono, setTelefono] = useState(distribuidor?.telefono ?? '');
  const [notas, setNotas] = useState(distribuidor?.notas ?? '');
  const [ivaDiscriminado, setIvaDiscriminado] = useState(distribuidor?.ivaDiscriminado ?? true);
  const [loading, setLoading] = useState(false);
  // cambiar el IVA de una distribuidora que ya tiene productos también corrige sus costos:
  // eso lo hace AjustarIvaModal (suma o resta la alícuota y guarda la opción nueva)
  const [ajustarIva, setAjustarIva] = useState(false);
  const [ivaAjustado, setIvaAjustado] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['distribuidores'] });
    if (distribuidor) qc.invalidateQueries({ queryKey: ['distribuidor', distribuidor.id] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        const cambioIva = ivaDiscriminado !== distribuidor.ivaDiscriminado;
        const conProductos = cambioIva && (await distribuidores.getProductos(distribuidor.id)).length > 0;
        await distribuidores.update(distribuidor.id, {
          nombre,
          telefono: telefono || null,
          notas: notas || null,
          // con productos, la opción la guarda el modal junto con el ajuste de costos
          ...(!conProductos && { ivaDiscriminado }),
        });
        invalidate();
        if (conProductos) {
          setAjustarIva(true);
          return;
        }
        toast.show('Cambios guardados');
        router.push(`/distribuidoras/${distribuidor.id}`);
      } else {
        const nueva = await distribuidores.create({ nombre, ivaDiscriminado, ...(telefono && { telefono }), ...(notas && { notas }) });
        invalidate();
        toast.show('Distribuidora creada');
        router.push(`/distribuidoras/${nueva.id}`);
      }
    } catch (err: any) {
      toast.show(err.message ?? 'Error al guardar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!distribuidor) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await distribuidores.delete(distribuidor.id);
      qc.invalidateQueries({ queryKey: ['distribuidores'] });
      toast.show(`Se eliminó "${distribuidor.nombre}"`);
      router.push('/distribuidoras');
    } catch (err: any) {
      setDeleteError(err.message ?? 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <Card className="gap-4">
        <Field label="Nombre" htmlFor="df-nombre">
          <input
            id="df-nombre"
            required
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de la distribuidora"
            className={inputClasses()}
          />
        </Field>

        <Field label="Teléfono" htmlFor="df-tel">
          <input id="df-tel" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="11-1234-5678" className={inputClasses()} />
        </Field>

        <Field label="Notas" htmlFor="df-notas">
          <textarea
            id="df-notas"
            rows={3}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Rubro, condiciones de pago, etc."
            className={inputClasses('min-h-20 resize-y')}
          />
        </Field>

        <div className="flex items-start gap-3 rounded-xl bg-kr-paper px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-kr-navy">IVA discriminado</p>
            <p className="mt-0.5 text-[13px] font-bold text-kr-muted">
              Prendelo si te factura el precio neto y el IVA aparte (factura A): al escanear, el IVA se suma al costo solo.
              Apagalo si el precio de la factura ya es el costo final.
            </p>
            {isEdit && ivaDiscriminado !== distribuidor.ivaDiscriminado && (
              <p className="mt-1.5 text-[13px] font-extrabold text-kr-blue">
                Al guardar vas a poder {ivaDiscriminado ? 'sumarle' : 'restarle'} el IVA a los costos que ya cargaste.
              </p>
            )}
          </div>
          <ToggleSwitch label="IVA discriminado" checked={ivaDiscriminado} onChange={() => setIvaDiscriminado((v) => !v)} />
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          {isEdit && (
            <button type="button" onClick={() => { setConfirmDelete(true); setDeleteError(''); }} className={buttonClasses('danger', 'md')}>
              Eliminar
            </button>
          )}
          <span className="flex-1" />
          <button type="button" onClick={() => router.back()} className={buttonClasses('secondary', 'md')}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} className={buttonClasses('primary', 'md', 'min-w-36')}>
            {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear'}
          </button>
        </div>
      </Card>

      {ajustarIva && distribuidor && (
        <AjustarIvaModal
          distribuidorId={distribuidor.id}
          distribuidorNombre={distribuidor.nombre}
          turningOn={ivaDiscriminado}
          onApplied={() => { setIvaAjustado(true); invalidate(); qc.invalidateQueries({ queryKey: ['products'] }); }}
          onClose={() => {
            setAjustarIva(false);
            if (!ivaAjustado) toast.show('Se guardaron los datos. El IVA quedó como estaba.');
            router.push(`/distribuidoras/${distribuidor.id}`);
          }}
        />
      )}

      {confirmDelete && distribuidor && (
        <ConfirmModal
          message={`¿Eliminar "${distribuidor.nombre}"? Esta acción no se puede deshacer.`}
          loading={deleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </form>
  );
}
