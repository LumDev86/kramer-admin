'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChatText, WhatsappLogo } from '@phosphor-icons/react';
import { sugerencias, SugerenciaEstado } from '@/lib/api';
import { formatDateTime, waLink, SUGERENCIA_ESTADO_COLOR, SUGERENCIA_ESTADO_LABEL } from '@/lib/format';
import PageHeader from '@/components/ui/PageHeader';
import Card, { CardTitle } from '@/components/ui/Card';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function SugerenciaDetallePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const { data: sugerencia, isLoading } = useQuery({
    queryKey: ['sugerencia', id],
    queryFn: () => sugerencias.getById(id),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { visible?: boolean; estado?: SugerenciaEstado }) => sugerencias.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sugerencia', id] });
      qc.invalidateQueries({ queryKey: ['sugerencias'] });
    },
    onError: (err: any) => toast.show(err.message ?? 'No se pudo guardar el cambio', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => sugerencias.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sugerencias'] });
      toast.show('Sugerencia borrada');
      router.push('/sugerencias');
    },
    onError: (err: Error) => setDeleteError(err.message ?? 'No se pudo borrar'),
  });

  if (isLoading) {
    return (
      <>
        <div className="h-16 w-72 animate-pulse rounded-2xl bg-white" />
        <div className="h-40 animate-pulse rounded-2xl bg-white" />
      </>
    );
  }
  if (!sugerencia) {
    return (
      <p className="rounded-2xl border border-kr-line bg-white px-4 py-10 text-center text-sm font-bold text-kr-muted">
        Sugerencia no encontrada. <Link href="/sugerencias" className="text-kr-blue underline">Volver</Link>
      </p>
    );
  }

  const conContacto = sugerencia.votos.filter((v) => v.contactoWhatsapp);
  const comentarios = sugerencia.votos.filter((v) => v.comentario);
  const mensajeAviso = (nombre: string | null) =>
    `Hola${nombre ? ` ${nombre}` : ''}! Te escribimos de Kiosco Kramer: ya tenemos ${sugerencia.nombre}, que nos habías sugerido. ¡Pedilo cuando quieras!`;

  return (
    <>
      <PageHeader
        back={{ href: '/sugerencias', label: 'Sugerencias' }}
        title={sugerencia.nombre}
        subtitle={`${sugerencia.votos.length} ${sugerencia.votos.length === 1 ? 'cliente la pidió' : 'clientes la pidieron'}${sugerencia.tipo ? ` · ${sugerencia.tipo}` : ''} · desde el ${formatDateTime(sugerencia.createdAt)}`}
        actions={
          <button type="button" onClick={() => setConfirmDelete(true)} className={buttonClasses('danger', 'md')}>
            Borrar
          </button>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <Card highlight aria-label="Estado de la sugerencia" className="gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-extrabold text-kr-muted">Estado</span>
            <select
              value={sugerencia.estado}
              onChange={(e) => updateMutation.mutate({ estado: e.target.value as SugerenciaEstado })}
              className={`min-h-11 rounded-xl border-[1.5px] px-3 text-[15px] font-extrabold outline-none focus:border-kr-blue ${SUGERENCIA_ESTADO_COLOR[sugerencia.estado]}`}
            >
              {(Object.keys(SUGERENCIA_ESTADO_LABEL) as SugerenciaEstado[]).map((e) => (
                <option key={e} value={e}>{SUGERENCIA_ESTADO_LABEL[e]}</option>
              ))}
            </select>
          </label>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-extrabold">Publicada en la tienda</p>
              <p className="text-[13px] font-bold text-kr-muted">
                {sugerencia.visible ? 'Aparece en el ranking y otros clientes la pueden votar.' : 'Solo la ves vos.'}
              </p>
            </div>
            <ToggleSwitch
              label="Publicada en la tienda"
              checked={sugerencia.visible}
              loading={updateMutation.isPending}
              onChange={() => updateMutation.mutate({ visible: !sugerencia.visible })}
            />
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card flush aria-labelledby="h-avisar">
            <div className="border-b border-kr-line px-4 py-3.5 sm:px-5">
              <CardTitle id="h-avisar">Avisarles cuando llegue ({conContacto.length})</CardTitle>
              <p className="text-[13px] font-bold text-kr-muted">Clientes que dejaron su WhatsApp para enterarse.</p>
            </div>
            {conContacto.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm font-bold text-kr-muted">Nadie dejó un contacto para esta sugerencia.</p>
            ) : (
              <ul>
                {conContacto.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-kr-line px-4 py-3 last:border-b-0 sm:px-5">
                    <div className="min-w-0">
                      <p className="font-extrabold">{v.contactoNombre ?? 'Sin nombre'}</p>
                      <p className="text-[13px] font-bold tabular-nums text-kr-muted">{v.contactoWhatsapp}</p>
                    </div>
                    <a
                      href={waLink(v.contactoWhatsapp!, mensajeAviso(v.contactoNombre))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClasses('success', 'sm')}
                    >
                      <WhatsappLogo size={16} weight="fill" />
                      Avisar que llegó
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card flush aria-labelledby="h-coment">
            <div className="border-b border-kr-line px-4 py-3.5 sm:px-5">
              <CardTitle id="h-coment">Comentarios ({comentarios.length})</CardTitle>
            </div>
            {comentarios.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm font-bold text-kr-muted">Nadie dejó comentarios.</p>
            ) : (
              <ul>
                {comentarios.map((v) => (
                  <li key={v.id} className="flex gap-3 border-b border-dashed border-kr-line px-4 py-3 last:border-b-0 sm:px-5">
                    <ChatText size={20} weight="bold" className="mt-0.5 flex-shrink-0 text-kr-muted" />
                    <div className="min-w-0">
                      <p className="font-bold">{v.comentario}</p>
                      <p className="mt-0.5 text-xs font-bold text-kr-muted">{formatDateTime(v.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmModal
          message={`¿Borrar la sugerencia "${sugerencia.nombre}" con sus ${sugerencia.votos.length} votos? No se puede deshacer.`}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => { setConfirmDelete(false); setDeleteError(''); }}
          loading={deleteMutation.isPending}
          error={deleteError}
        />
      )}
    </>
  );
}
