'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { config, StoreScheduleDay } from '@/lib/api';
import { CheckCircle, Clock, XCircle, HourglassMedium } from '@phosphor-icons/react';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const STATUS_OPTIONS = [
  {
    value: 'open',
    label: 'Abierto',
    description: 'El local acepta pedidos normalmente',
    icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-50 border-green-300',
    activeBg: 'bg-green-500',
  },
  {
    value: 'busy',
    label: 'Ocupado',
    description: 'El local acepta pedidos con demora',
    icon: HourglassMedium,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50 border-yellow-300',
    activeBg: 'bg-yellow-500',
  },
  {
    value: 'closed',
    label: 'Cerrado',
    description: 'El local no acepta pedidos',
    icon: XCircle,
    color: 'text-gray-400',
    bg: 'bg-gray-50 border-gray-200',
    activeBg: 'bg-gray-500',
  },
];

export default function ConfiguracionPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['store-config'],
    queryFn: () => config.get(),
  });

  const [status, setStatus] = useState<'open' | 'busy' | 'closed'>('open');
  const [busyTime, setBusyTime] = useState<number>(60);
  const [schedule, setSchedule] = useState<StoreScheduleDay[]>([]);
  const [savedStatus, setSavedStatus] = useState(false);
  const [savedSchedule, setSavedSchedule] = useState(false);

  useEffect(() => {
    if (data) {
      setStatus(data.status);
      setBusyTime(data.busyTime ?? 60);
      setSchedule(data.schedule);
    }
  }, [data]);

  const statusMutation = useMutation({
    mutationFn: () => config.updateStatus(status, status === 'busy' ? busyTime : null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-config'] });
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2000);
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: () => config.updateSchedule(schedule),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-config'] });
      setSavedSchedule(true);
      setTimeout(() => setSavedSchedule(false), 2000);
    },
  });

  const updateDay = (dayOfWeek: number, field: keyof StoreScheduleDay, value: boolean | number) => {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d))
    );
  };

  if (isLoading) {
    return <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />;
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl animate-fadeIn">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800">Configuración</h1>
        <p className="text-sm text-gray-400 font-medium mt-0.5">Estado del local y horarios de atención</p>
      </div>

      {/* Estado del local */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-5">
        <h2 className="text-base font-extrabold text-gray-700">Estado del local</h2>

        <div className="grid grid-cols-3 gap-3">
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value as typeof status)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  isSelected ? `${opt.bg} shadow-sm scale-[1.02]` : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <Icon
                  size={32}
                  weight="fill"
                  className={isSelected ? opt.color : 'text-gray-300'}
                />
                <p className={`text-sm font-extrabold ${isSelected ? 'text-gray-800' : 'text-gray-400'}`}>
                  {opt.label}
                </p>
                <p className="text-[10px] text-gray-400 text-center leading-tight font-medium">
                  {opt.description}
                </p>
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
          className={`py-3 rounded-xl font-bold text-sm transition-all ${
            savedStatus
              ? 'bg-green-500 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60'
          }`}
        >
          {savedStatus ? '✓ Estado guardado' : statusMutation.isPending ? 'Guardando...' : 'Guardar estado'}
        </button>
      </div>

      {/* Horario semanal */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-5">
        <h2 className="text-base font-extrabold text-gray-700">Horario de atención</h2>

        <div className="flex flex-col gap-2">
          {schedule.map((day) => (
            <div
              key={day.dayOfWeek}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${
                day.isOpen ? 'bg-gray-50' : 'bg-gray-50/50 opacity-60'
              }`}
            >
              <span className="w-24 text-sm font-bold text-gray-700 flex-shrink-0">
                {DAYS[day.dayOfWeek]}
              </span>

              <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                <div
                  onClick={() => updateDay(day.dayOfWeek, 'isOpen', !day.isOpen)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    day.isOpen ? 'bg-green-400' : 'bg-gray-200'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    day.isOpen ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </div>
                <span className="text-xs font-semibold text-gray-500">
                  {day.isOpen ? 'Abierto' : 'Cerrado'}
                </span>
              </label>

              {day.isOpen && (
                <div className="flex items-center gap-2 ml-auto animate-fadeIn">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={day.openHour}
                    onChange={(e) => updateDay(day.dayOfWeek, 'openHour', parseInt(e.target.value))}
                    className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-center outline-none focus:border-orange-400"
                  />
                  <span className="text-xs text-gray-400 font-semibold">a</span>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={day.closeHour}
                    onChange={(e) => updateDay(day.dayOfWeek, 'closeHour', parseInt(e.target.value))}
                    className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-center outline-none focus:border-orange-400"
                  />
                  <span className="text-xs text-gray-400 font-medium">hs</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => scheduleMutation.mutate()}
          disabled={scheduleMutation.isPending}
          className={`py-3 rounded-xl font-bold text-sm transition-all ${
            savedSchedule
              ? 'bg-green-500 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60'
          }`}
        >
          {savedSchedule ? '✓ Horario guardado' : scheduleMutation.isPending ? 'Guardando...' : 'Guardar horario'}
        </button>
      </div>
    </div>
  );
}
