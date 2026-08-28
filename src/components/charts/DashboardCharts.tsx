"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const TURQUI = "#123852";
const RED = "#d62828";
const CATEGORY_COLORS = ["#123852", "#d62828", "#2a6f9c", "#eab308", "#16a34a", "#7aabcc"];

export function RevenueChart({ data }: { data: Array<{ month: string; total: number }> }) {
  if (data.length === 0) return <EmptyChart label="Sin pagos registrados aun" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} width={70} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => `$${v.toLocaleString("es-CO")}`} />
        <Bar dataKey="total" name="Ingresos" fill={TURQUI} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DelinquencyChart({ data }: { data: Array<{ category: string; debt: number }> }) {
  if (data.length === 0) return <EmptyChart label="No hay cartera pendiente" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} width={90} />
        <Tooltip formatter={(v: number) => `$${v.toLocaleString("es-CO")}`} />
        <Bar dataKey="debt" name="Cartera" fill={RED} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AttendanceChart({ data }: { data: Array<{ week: string; percentage: number }> }) {
  if (data.length === 0) return <EmptyChart label="Sin asistencia registrada aun" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
        <Tooltip formatter={(v: number) => `${v}%`} />
        <Line type="monotone" dataKey="percentage" name="Asistencia" stroke={TURQUI} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PlayersByCategoryChart({ data }: { data: Array<{ category: string; count: number }> }) {
  if (data.length === 0 || data.every((d) => d.count === 0)) return <EmptyChart label="Sin jugadores activos" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={90} label>
          {data.map((_, i) => (
            <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
          ))}
        </Pie>
        <Legend />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">
      {label}
    </div>
  );
}
