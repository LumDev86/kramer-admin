'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { sugerencias, SugerenciaEstado } from '@/lib/api';
import { CaretLeft, WhatsappLogo, Trash, ChatText } from '@phosphor-icons/react';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatDateTime, waLink, SUGERENCIA_ESTADO_COLOR, SUGERENCIA_ESTADO_LABEL } from '@/lib/format';

export default function SugerenciaDetallePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const qc = useQueryClient();
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
  });

  const deleteMutation = useMutation({
    mutationFn: () => sugerencias.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sugerencias'] });
      router.push('/sugerencias');
    },
    onError: (err: Error) => setDeleteError(err.message ?? 'No se pudo borrar'),
  });

  if (isLoading) {
    return <div className="h-40 bg-white rounded-2xl animate-pulse" />;
  }
  if (!sugerencia) {
    return <p className="text-sm text-gray-400">Sugerencia no encontrada.</p>;
  }

  const conContacto = sugerencia.votos.filter((v) => v.contactoWhatsapp);
  const comentarios = sugerencia.votos.filter((v) => v.comentario);
  const mensajeAviso = (nombre: string | null) =>
    `Hola${nombre ? ` ${nombre}` : ''}! Te escribimos de Kiosco Kramer: ya tenemos ${sugerencia.nombre}, que nos habías sugerido. ¡Pedilo cuando quieras!`;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <Link href="/sugerencias" className="flex items-center gap-1 text-sm font-semibold text-gray-400 hover:text-orange-500 w-fit">
        <CaretLeft size={16} weight="bold" />
        Sugerencias
      </Link>

      <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">{sugerencia.nombre}</h1>
            <p className="text-sm text-gray-400 font-medium mt-0.5">
              {sugerencia.votos.length} {sugerencia.votos.length === 1 ? 'cliente la pidió' : 'clientes la pidieron'}
              {sugerencia.tipo && ` · ${sugerencia.tipo}`} · desde el {formatDateTime(sugerencia.createdAt)}
            </p>
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="Borrar sugerencia"
            className="w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <Trash size={18} weight="bold" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-gray-100">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Estado</span>
            <select
              value={sugerencia.estado}
              onChange={(e) => updateMutation.mutate({ estado: e.target.value as SugerenciaEstado })}
              className={`px-3 py-2 rounded-lg border text-sm font-bold outline-none ${SUGERENCIA_ESTADO_COLOR[sugerencia.estado]}`}
            >
              {(Object.keys(SUGERENCIA_ESTADO_LABEL) as SugerenciaEstado[]).map((e) => (
                <option key={e} value={e}>{SUGERENCIA_ESTADO_LABEL[e]}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Publicada en la tienda</span>
            <div className="flex items-center gap-2 h-9">
              <ToggleSwitch
                checked={sugerencia.visible}
                loading={updateMutation.isPending}
                onChange={() => updateMutation.mutate({ visible: !sugerencia.visible })}
              />
              <span className="text-xs text-gray-400 font-medium">
                {sugerencia.visible ? 'Aparece en el ranking y se puede votar' : 'Solo la ves vos'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700">Avisarles cuando llegue ({conContacto.length})</h2>
          <p className="text-xs text-gray-400 font-medium">Clientes que dejaron su WhatsApp para enterarse.</p>
        </div>
        {conContacto.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-gray-400 font-medium">Nadie dejó un contacto para esta sugerencia.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {conContacto.map((v) => (
              <li key={v.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{v.contactoNombre ?? 'Sin nombre'}</p>
                  <p className="text-xs text-gray-400">{v.contactoWhatsapp}</p>
                </div>
                <a
                  href={waLink(v.contactoWhatsapp!, mensajeAviso(v.contactoNombre))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition-colors"
                >
                  <WhatsappLogo size={15} weight="fill" />
                  Avisar que llegó
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700">Comentarios ({comentarios.length})</h2>
        </div>
        {comentarios.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-gray-400 font-medium">Nadie dejó comentarios.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {comentarios.map((v) => (
              <li key={v.id} className="px-5 py-3 flex gap-3">
                <ChatText size={18} className="text-gray-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-700">{v.comentario}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(v.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {confirmDelete && (
        <ConfirmModal
          message={`¿Borrar la sugerencia "${sugerencia.nombre}" con sus ${sugerencia.votos.length} votos? No se puede deshacer.`}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => { setConfirmDelete(false); setDeleteError(''); }}
          loading={deleteMutation.isPending}
          error={deleteError}
        />
      )}
    </div>
  );
}
