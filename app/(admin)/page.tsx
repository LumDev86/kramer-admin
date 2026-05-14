'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { products, categories, banners, config, StoreScheduleDay } from '@/lib/api';
import {
  Package, Tag, Image, CheckCircle, XCircle,
  HourglassMedium, Clock, Check, WhatsappLogo, Bank, IdentificationCard,
} from '@phosphor-icons/react';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const STATUS_OPTIONS = [
  {
    value: 'open',
    label: 'Abierto',
    sub: 'Acepta pedidos normalmente',
    icon: CheckCircle,
    ring: 'ring-green-400',
    bg: 'bg-green-50',
    iconColor: 'text-green-500',
    badge: 'bg-green-100 text-green-700',
  },
  {
    value: 'busy',
    label: 'Ocupado',
    sub: 'Acepta con demora',
    icon: HourglassMedium,
    ring: 'ring-yellow-400',
    bg: 'bg-yellow-50',
    iconColor: 'text-yellow-500',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  {
    value: 'closed',
    label: 'Cerrado',
    sub: 'No acepta pedidos',
    icon: XCircle,
    ring: 'ring-gray-300',
    bg: 'bg-gray-50',
    iconColor: 'text-gray-400',
    badge: 'bg-gray-100 text-gray-500',
  },
];

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: any; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} weight="fill" className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-800">{value}</p>
        <p className="text-xs text-gray-400 font-semibold">{label}</p>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
        checked ? 'bg-green-400' : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function HourSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-gray-700 outline-none focus:border-orange-400 bg-white cursor-pointer"
    >
      {HOURS.map((h) => (
        <option key={h} value={h}>
          {String(h).padStart(2, '0')}:00
        </option>
      ))}
    </select>
  );
}

export default function DashboardPage() {
  const qc = useQueryClient();

  const { data: prodData }   = useQuery({ queryKey: ['products',    { limit: 1 }], queryFn: () => products.getAll({ limit: 1 }) });
  const { data: catData }    = useQuery({ queryKey: ['categories',  { limit: 1 }], queryFn: () => categories.getAll({ limit: 1 }) });
  const { data: banData }    = useQuery({ queryKey: ['banners'],         queryFn: () => banners.getAll() });
  const { data: storeData, isLoading: loadingConfig } = useQuery({
    queryKey: ['store-config'],
    queryFn: () => config.get(),
  });

  const [status, setStatus]     = useState<'open' | 'busy' | 'closed'>('open');
  const [busyTime, setBusyTime] = useState<number>(60);
  const [schedule, setSchedule] = useState<StoreScheduleDay[]>([]);
  const [contact, setContact]   = useState({ whatsappNumber: '', cbu: '', alias: '', titular: '' });
  const [statusSaved, setStatusSaved]     = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [contactSaved, setContactSaved]   = useState(false);

  useEffect(() => {
    if (storeData) {
      setStatus(storeData.status);
      setBusyTime(storeData.busyTime ?? 60);
      setSchedule(storeData.schedule);
      setContact({
        whatsappNumber: storeData.whatsappNumber ?? '',
        cbu:            storeData.cbu            ?? '',
        alias:          storeData.alias          ?? '',
        titular:        storeData.titular        ?? '',
      });
    }
  }, [storeData]);

  const statusMutation = useMutation({
    mutationFn: () => config.updateStatus(status, status === 'busy' ? busyTime : null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-config'] });
      setStatusSaved(true);
      setTimeout(() => setStatusSaved(false), 2500);
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: () => config.updateSchedule(schedule),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-config'] });
      setScheduleSaved(true);
      setTimeout(() => setScheduleSaved(false), 2500);
    },
  });

  const contactMutation = useMutation({
    mutationFn: () => config.updateContact(contact),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-config'] });
      setContactSaved(true);
      setTimeout(() => setContactSaved(false), 2500);
    },
  });

  const updateDay = (dayOfWeek: number, field: keyof StoreScheduleDay, value: boolean | number) => {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d))
    );
  };

  const totalProducts   = prodData?.meta.total ?? '—';
  const totalCategories = catData?.meta.total  ?? '—';
  const activeBanners   = banData?.filter((b) => b.isActive).length ?? '—';

  return (
    <div className="flex flex-col gap-7 animate-fadeIn">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-400 font-medium mt-0.5">Resumen y configuración del local</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Productos"      value={totalProducts}   icon={Package} color="bg-orange-500" />
        <StatCard label="Categorías"     value={totalCategories} icon={Tag}     color="bg-blue-500"   />
        <StatCard label="Banners activos" value={activeBanners}  icon={Image}   color="bg-green-500"  />
      </div>

      <div className="grid grid-cols-2 gap-6">

        {/* Estado del local */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-5">
          <h2 className="text-base font-extrabold text-gray-700">Estado del local</h2>

          <div className="flex flex-col gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value as typeof status)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? `${opt.bg} ring-2 ${opt.ring} border-transparent`
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <Icon size={22} weight="fill" className={isSelected ? opt.iconColor : 'text-gray-300'} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-extrabold ${isSelected ? 'text-gray-800' : 'text-gray-400'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">{opt.sub}</p>
                  </div>
                  {isSelected && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${opt.badge}`}>
                      Activo
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {status === 'busy' && (
            <div className="flex flex-col gap-2 animate-slideUp">
              <p className="text-xs font-semibold text-gray-500">Tiempo estimado de demora</p>
              <div className="flex gap-2">
                {[60, 90].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setBusyTime(min)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                      busyTime === min
                        ? 'border-yellow-400 bg-yellow-50 text-yellow-600'
                        : 'border-gray-100 text-gray-400 hover:border-yellow-200'
                    }`}
                  >
                    <Clock size={14} weight="fill" />
                    {min} min
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => statusMutation.mutate()}
            disabled={statusMutation.isPending}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all mt-auto ${
              statusSaved
                ? 'bg-green-500 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60'
            }`}
          >
            {statusSaved && <Check size={16} weight="bold" />}
            {statusSaved ? 'Guardado' : statusMutation.isPending ? 'Guardando...' : 'Guardar estado'}
          </button>
        </div>

        {/* Horario de atención */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
          <h2 className="text-base font-extrabold text-gray-700">Horario de atención</h2>

          {loadingConfig ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {schedule.map((day) => (
                <div key={day.dayOfWeek} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="w-20 text-xs font-bold text-gray-600 flex-shrink-0">
                    {DAYS[day.dayOfWeek]}
                  </span>

                  <Toggle
                    checked={day.isOpen}
                    onChange={(v) => updateDay(day.dayOfWeek, 'isOpen', v)}
                  />

                  {day.isOpen ? (
                    <div className="flex items-center gap-1.5 flex-1 animate-fadeIn">
                      <HourSelect
                        value={day.openHour}
                        onChange={(v) => updateDay(day.dayOfWeek, 'openHour', v)}
                      />
                      <span className="text-xs text-gray-300 font-bold">—</span>
                      <HourSelect
                        value={day.closeHour}
                        onChange={(v) => updateDay(day.dayOfWeek, 'closeHour', v)}
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300 font-semibold flex-1">Cerrado</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => scheduleMutation.mutate()}
            disabled={scheduleMutation.isPending || schedule.length === 0}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all mt-auto ${
              scheduleSaved
                ? 'bg-green-500 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60'
            }`}
          >
            {scheduleSaved && <Check size={16} weight="bold" />}
            {scheduleSaved ? 'Guardado' : scheduleMutation.isPending ? 'Guardando...' : 'Guardar horario'}
          </button>
        </div>

      </div>

      {/* Datos de contacto y pago */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-5">
        <h2 className="text-base font-extrabold text-gray-700">Datos de contacto y pago</h2>

        <div className="grid grid-cols-2 gap-4">

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
              <WhatsappLogo size={13} weight="fill" className="text-green-500" />
              Número de WhatsApp
            </label>
            <input
              type="text"
              value={contact.whatsappNumber}
              onChange={(e) => setContact({ ...contact, whatsappNumber: e.target.value })}
              placeholder="5491112345678"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
            />
            <p className="text-[10px] text-gray-400">Sin + ni espacios. Ej: 5491124805770</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
              <IdentificationCard size={13} weight="fill" className="text-blue-400" />
              Titular de la cuenta
            </label>
            <input
              type="text"
              value={contact.titular}
              onChange={(e) => setContact({ ...contact, titular: e.target.value })}
              placeholder="Nombre Apellido"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
              <Bank size={13} weight="fill" className="text-orange-400" />
              CVU / CBU
            </label>
            <input
              type="text"
              value={contact.cbu}
              onChange={(e) => setContact({ ...contact, cbu: e.target.value })}
              placeholder="0000003100054149448072"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-orange-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
              <Bank size={13} weight="fill" className="text-orange-400" />
              Alias
            </label>
            <input
              type="text"
              value={contact.alias}
              onChange={(e) => setContact({ ...contact, alias: e.target.value })}
              placeholder="agua25"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-orange-400"
            />
          </div>

        </div>

        <button
          onClick={() => contactMutation.mutate()}
          disabled={contactMutation.isPending}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
            contactSaved
              ? 'bg-green-500 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60'
          }`}
        >
          {contactSaved && <Check size={16} weight="bold" />}
          {contactSaved ? 'Guardado' : contactMutation.isPending ? 'Guardando...' : 'Guardar datos'}
        </button>
      </div>

    </div>
  );
}
