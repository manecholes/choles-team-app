"use client";

import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const TURQUI = "#123852";
const RED = "#d62828";

export function MetricEvolutionChart({ data, unit }: { data: Array<{ date: string; value: number }>; unit?: string }) {
  if (data.length === 0) return <EmptyChart label="Sin datos registrados aun" />;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={40} />
        <Tooltip formatter={(v: number) => `${v}${unit ? ` ${unit}` : ""}`} />
        <Line type="monotone" dataKey="value" stroke={TURQUI} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function LoadEvolutionChart({ data }: { data: Array<{ date: string; load: number }> }) {
  if (data.length === 0) return <EmptyChart label="Sin cargas de entrenamiento registradas" />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={40} />
        <Tooltip />
        <Bar dataKey="load" name="Carga (RPE x min)" fill={RED} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AttendanceEvolutionChart({ data }: { data: Array<{ week: string; percentage: number }> }) {
  if (data.length === 0) return <EmptyChart label="Sin asistencia registrada aun" />;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
        <Tooltip formatter={(v: number) => `${v}%`} />
        <Line type="monotone" dataKey="percentage" stroke={TURQUI} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const STATUS_CONFIG: Record<string, { emoji: string; label: string; className: string }> = {
  OPTIMAL: { emoji: "🟢", label: "Estado optimo", className: "bg-green-50 text-green-700 border-green-200" },
  ATTENTION: { emoji: "🟡", label: "Atencion", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  RISK: { emoji: "🔴", label: "Riesgo / fatiga", className: "bg-red-50 text-choles-red border-red-200" },
};

export function LoadSemaphore({ status, ratio }: { status: string; ratio: number | null }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.OPTIMAL;
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${cfg.className}`}>
      <span className="text-2xl">{cfg.emoji}</span>
      <div>
        <p className="font-semibold">{cfg.label}</p>
        <p className="text-xs opacity-80">
          {ratio !== null ? `Indice de carga aguda/cronica (ACWR): ${ratio}` : "Sin suficiente historial de carga para calcular el ACWR"}
        </p>
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-[180px] items-center justify-center text-sm text-slate-400">{label}</div>;
}
