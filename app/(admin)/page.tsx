'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { config, StoreScheduleDay, StoreConfig } from '@/lib/api';
import { CalendarBlank, Check, CheckCircle, Clock, Copy, HourglassMedium, XCircle } from '@phosphor-icons/react';
import PageHeader from '@/components/ui/PageHeader';
import Card, { CardTitle } from '@/components/ui/Card';
import Field, { inputClasses } from '@/components/ui/Field';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const RepartidoresMap = dynamic(() => import('@/components/maps/RepartidoresMap'), { ssr: false });

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
// la hora de cierre puede pasar de 24 para los horarios que cruzan la medianoche (ej. 25 =
// 01:00 del día siguiente) - hasta 29 (05:00) cubre bien los horarios nocturnos reales
const CLOSE_HOURS = Array.from({ length: 30 }, (_, i) => i);

const horaTexto = (h: number) => `${String(h % 24).padStart(2, '0')}:00`;

const STATUS_OPTIONS: { value: StoreConfig['status']; label: string; sub: string; icon: typeof CheckCircle; on: string }[] = [
  { value: 'auto', label: 'Automático', sub: 'Sigue el horario de atención', icon: CalendarBlank, on: 'bg-kr-blue-soft text-kr-blue' },
  { value: 'open', label: 'Abierta', sub: 'Acepta pedidos normalmente', icon: CheckCircle, on: 'bg-kr-green-soft text-kr-green-dark' },
  { value: 'busy', label: 'Ocupada', sub: 'Acepta pedidos con demora', icon: HourglassMedium, on: 'bg-kr-yellow-soft text-kr-navy' },
  { value: 'closed', label: 'Cerrada', sub: 'No acepta pedidos', icon: XCircle, on: 'bg-[#EEE9DE] text-kr-muted' },
];

// en modo automático: ¿el horario de hoy (o el de ayer que cruza la medianoche) incluye esta hora?
function abiertaPorHorario(schedule: StoreScheduleDay[], now: Date): { abierta: boolean; cierra?: number } {
  const h = now.getHours();
  const hoy = schedule.find((d) => d.dayOfWeek === now.getDay());
  if (hoy?.isOpen && h >= hoy.openHour && h < hoy.closeHour) return { abierta: true, cierra: hoy.closeHour };
  const ayer = schedule.find((d) => d.dayOfWeek === (now.getDay() + 6) % 7);
  if (ayer?.isOpen && ayer.closeHour > 24 && h < ayer.closeHour - 24) return { abierta: true, cierra: ayer.closeHour };
  return { abierta: false };
}

function HourSelect({ value, onChange, options = HOURS, label }: { value: number; onChange: (v: number) => void; options?: number[]; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="min-h-10 rounded-[10px] border-[1.5px] border-kr-line bg-kr-paper px-2 text-sm font-extrabold tabular-nums text-kr-navy outline-none focus:border-kr-blue"
    >
      {options.map((h) => (
        <option key={h} value={h}>
          {h < 24 ? horaTexto(h) : `${horaTexto(h)} (+1 día)`}
        </option>
      ))}
    </select>
  );
}

export default function ConfiguracionPage() {
  const qc = useQueryClient();
  const toast = useToast();

  const { data: storeData, isLoading: loadingConfig } = useQuery({
    queryKey: ['store-config'],
    queryFn: () => config.get(),
  });

  const [status, setStatus] = useState<StoreConfig['status']>('open');
  const [busyTime, setBusyTime] = useState<number>(60);
  const [schedule, setSchedule] = useState<StoreScheduleDay[]>([]);
  const [contact, setContact] = useState({ whatsappNumber: '', cbu: '', alias: '', titular: '' });
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (storeData) {
      setStatus(storeData.status);
      setBusyTime(storeData.busyTime ?? 60);
      setSchedule(storeData.schedule);
      setContact({
        whatsappNumber: storeData.whatsappNumber ?? '',
        cbu: storeData.cbu ?? '',
        alias: storeData.alias ?? '',
        titular: storeData.titular ?? '',
      });
      setUbicacion(storeData.lat !== null && storeData.lng !== null ? { lat: storeData.lat, lng: storeData.lng } : null);
    }
  }, [storeData]);

  const guardado = (msg: string) => () => {
    qc.invalidateQueries({ queryKey: ['store-config'] });
    toast.show(msg);
  };
  const fallo = (err: any) => toast.show(err.message ?? 'No se pudo guardar', 'error');

  const statusMutation = useMutation({
    mutationFn: () => config.updateStatus(status, status === 'busy' ? busyTime : null),
    onSuccess: guardado('Estado de la tienda guardado'),
    onError: fallo,
  });
  const scheduleMutation = useMutation({
    mutationFn: () => config.updateSchedule(schedule),
    onSuccess: guardado('Horarios guardados'),
    onError: fallo,
  });
  const contactMutation = useMutation({
    mutationFn: () => config.updateContact(contact),
    onSuccess: guardado('Datos de contacto y cobro guardados'),
    onError: fallo,
  });
  const ubicacionMutation = useMutation({
    mutationFn: () => config.updateUbicacion(ubicacion!.lat, ubicacion!.lng),
    onSuccess: guardado('Ubicación guardada'),
    onError: fallo,
  });

  const updateDay = (dayOfWeek: number, field: keyof StoreScheduleDay, value: boolean | number) => {
    setSchedule((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d)));
  };

  // el estado que ve hoy el cliente, según lo guardado (no lo que se está editando)
  const estadoActual = (() => {
    if (!storeData) return null;
    if (storeData.status === 'open') return { texto: 'Abierta ahora', tono: 'bg-kr-green-soft text-kr-green-dark' };
    if (storeData.status === 'busy') return { texto: `Ocupada · demora ${storeData.busyTime ?? 60} min`, tono: 'bg-kr-yellow-soft text-kr-navy' };
    if (storeData.status === 'closed') return { texto: 'Cerrada', tono: 'bg-[#EEE9DE] text-kr-muted' };
    const r = abiertaPorHorario(storeData.schedule, new Date());
    return r.abierta
      ? { texto: `Abierta ahora · cierra ${horaTexto(r.cierra!)}`, tono: 'bg-kr-green-soft text-kr-green-dark' }
      : { texto: 'Cerrada ahora (por horario)', tono: 'bg-[#EEE9DE] text-kr-muted' };
  })();

  const copiarAlias = () => {
    if (!contact.alias) return;
    navigator.clipboard.writeText(contact.alias);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <>
      <PageHeader
        title="Configuración"
        subtitle="Estado de la tienda, horarios, datos de cobro y ubicación."
        badges={
          estadoActual && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-extrabold ${estadoActual.tono}`}>
              <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
              {estadoActual.texto}
            </span>
          )
        }
      />

      <Card aria-labelledby="h-est">
        <CardTitle id="h-est">Estado de la tienda</CardTitle>
        <div role="radiogroup" aria-label="Estado de la tienda" className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const sel = status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={sel}
                onClick={() => setStatus(opt.value)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors ${
                  sel ? `border-2 border-kr-navy shadow-pop-sm ${opt.on}` : 'border-[1.5px] border-kr-line bg-white hover:border-kr-navy/40'
                }`}
              >
                <Icon size={24} weight={sel ? 'fill' : 'regular'} className="flex-shrink-0" />
                <span className="flex min-w-0 flex-col">
                  <b className="font-extrabold text-kr-navy">{opt.label}</b>
                  <small className="text-[13px] font-bold text-kr-muted">{opt.sub}</small>
                </span>
              </button>
            );
          })}
        </div>
        {status === 'busy' && (
          <div className="flex flex-wrap items-center gap-2 animate-fadeIn">
            <span className="text-sm font-extrabold text-kr-muted">Demora:</span>
            {[60, 90].map((min) => (
              <button
                key={min}
                type="button"
                aria-pressed={busyTime === min}
                onClick={() => setBusyTime(min)}
                className={`flex min-h-10 items-center gap-1.5 rounded-xl px-3.5 text-sm font-extrabold ${
                  busyTime === min ? 'border-2 border-kr-navy bg-kr-yellow' : 'border-[1.5px] border-kr-line bg-white hover:border-kr-navy/40'
                }`}
              >
                <Clock size={16} weight="bold" />
                {min} min
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <button type="button" onClick={() => statusMutation.mutate()} disabled={statusMutation.isPending} className={buttonClasses('primary', 'md')}>
            {statusMutation.isPending ? 'Guardando…' : 'Guardar estado'}
          </button>
        </div>
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Card aria-labelledby="h-hor">
          <CardTitle id="h-hor">Horarios de atención</CardTitle>
          {loadingConfig ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-kr-sand" />)}
            </div>
          ) : (
            <ul className="flex flex-col">
              {schedule.map((day) => (
                <li key={day.dayOfWeek} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-dashed border-kr-line py-2.5 last:border-b-0">
                  <ToggleSwitch
                    label={`${DAYS[day.dayOfWeek]} abierto`}
                    checked={day.isOpen}
                    onChange={() => updateDay(day.dayOfWeek, 'isOpen', !day.isOpen)}
                  />
                  <span className="w-24 font-extrabold">{DAYS[day.dayOfWeek]}</span>
                  {day.isOpen ? (
                    <span className="flex items-center gap-2 animate-fadeIn">
                      <HourSelect label={`Abre el ${DAYS[day.dayOfWeek]}`} value={day.openHour} onChange={(v) => updateDay(day.dayOfWeek, 'openHour', v)} />
                      <span className="text-sm font-bold text-kr-muted">a</span>
                      <HourSelect
                        label={`Cierra el ${DAYS[day.dayOfWeek]}`}
                        value={day.closeHour}
                        onChange={(v) => updateDay(day.dayOfWeek, 'closeHour', v)}
                        options={CLOSE_HOURS}
                      />
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-kr-muted">Cerrado</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => scheduleMutation.mutate()}
              disabled={scheduleMutation.isPending || schedule.length === 0}
              className={buttonClasses('primary', 'md')}
            >
              {scheduleMutation.isPending ? 'Guardando…' : 'Guardar horarios'}
            </button>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card aria-labelledby="h-cob">
            <CardTitle id="h-cob">Contacto y cobro</CardTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="WhatsApp" htmlFor="cf-wa" hint="Sin + ni espacios. Ej: 5491124805770">
                <input id="cf-wa" inputMode="numeric" value={contact.whatsappNumber} onChange={(e) => setContact({ ...contact, whatsappNumber: e.target.value })} placeholder="5491112345678" className={inputClasses()} />
              </Field>
              <Field label="Titular de la cuenta" htmlFor="cf-tit">
                <input id="cf-tit" value={contact.titular} onChange={(e) => setContact({ ...contact, titular: e.target.value })} placeholder="Nombre Apellido" className={inputClasses()} />
              </Field>
              <Field label="CVU / CBU" htmlFor="cf-cbu">
                <input id="cf-cbu" inputMode="numeric" value={contact.cbu} onChange={(e) => setContact({ ...contact, cbu: e.target.value })} placeholder="0000003100054149448072" className={inputClasses('font-mono')} />
              </Field>
              <Field label="Alias" htmlFor="cf-alias">
                <input id="cf-alias" value={contact.alias} onChange={(e) => setContact({ ...contact, alias: e.target.value })} placeholder="kiosco.kramer" className={inputClasses('font-mono')} />
              </Field>
            </div>

            {(contact.alias || contact.cbu) && (
              <div className="flex flex-col gap-1.5 rounded-xl border-[1.5px] border-dashed border-kr-line bg-kr-paper px-3.5 py-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-kr-muted">Así lo ve el cliente al pagar</span>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 break-all">
                    <span className="text-sm font-bold text-kr-muted">{contact.alias ? 'Alias ' : 'CVU '}</span>
                    <b className="font-mono font-extrabold">{contact.alias || contact.cbu}</b>
                  </span>
                  {contact.alias && (
                    <button type="button" onClick={copiarAlias} className={buttonClasses('secondary', 'sm')}>
                      {copiado ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
                      {copiado ? 'Copiado' : 'Copiar'}
                    </button>
                  )}
                </div>
                {contact.titular && <span className="text-[13px] font-bold text-kr-muted">A nombre de {contact.titular}</span>}
              </div>
            )}

            <div className="flex justify-end">
              <button type="button" onClick={() => contactMutation.mutate()} disabled={contactMutation.isPending} className={buttonClasses('primary', 'md')}>
                {contactMutation.isPending ? 'Guardando…' : 'Guardar contacto'}
              </button>
            </div>
          </Card>

          <Card aria-labelledby="h-ubi">
            <CardTitle id="h-ubi">Ubicación del local</CardTitle>
            <div className="overflow-hidden rounded-xl border border-kr-line">
              <RepartidoresMap
                fill
                repartidores={[]}
                storeLat={ubicacion?.lat ?? null}
                storeLng={ubicacion?.lng ?? null}
                onMapClick={(lat, lng) => setUbicacion({ lat, lng })}
              />
            </div>
            <p className="text-[13px] font-bold text-kr-muted">
              Tocá el mapa para mover el pin. Se usa para calcular el envío y qué repartidor está más cerca.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => ubicacionMutation.mutate()}
                disabled={!ubicacion || ubicacionMutation.isPending}
                className={buttonClasses('primary', 'md')}
              >
                {ubicacionMutation.isPending ? 'Guardando…' : 'Guardar ubicación'}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
