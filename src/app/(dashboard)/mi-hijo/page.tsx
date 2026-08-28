"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dumbbell, Trophy, Calendar, Wallet, LineChart, ClipboardList, Bell, ArrowRight } from "lucide-react";
import { Badge, statusBadge } from "@/components/Badge";

interface ChildOption {
  id: number;
  firstName: string;
  lastName: string;
}

interface ChildSummary {
  player: { id: number; firstName: string; lastName: string; category: string | null; team: string | null; status: string };
  nextTraining: { id: number; date: string; startTime: string; location: string | null } | null;
  nextMatch: { id: number; date: string; opponentName: string; isHome: boolean } | null;
  attendancePercentage: number | null;
  payments: {
    totalDebt: number;
    overdueCount: number;
    pendingCount: number;
    items: Array<{ id: number; concept: string; amount: number; dueDate: string | null; status: string; daysOverdue: number }>;
  };
}

function fmtMoney(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
}

export default function MiHijoPage() {
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [summary, setSummary] = useState<ChildSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/guardians/me/children");
      const data = await res.json();
      setChildren(data.children ?? []);
      if (data.children?.length > 0) setSelectedId(data.children[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      const res = await fetch(`/api/guardians/me/children/${selectedId}/summary`);
      if (res.ok) setSummary((await res.json()).summary);
    })();
  }, [selectedId]);

  if (loading) return <p className="text-sm text-slate-400">Cargando...</p>;

  if (children.length === 0) {
    return (
      <div className="card text-sm text-slate-400">
        No tienes jugadores vinculados a tu cuenta todavia. Contacta al club para verificar tu registro.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Mi Hijo</h1>
        <p className="text-sm text-slate-500">Todo lo que necesitas saber, en un solo lugar.</p>
      </div>

      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                selectedId === c.id ? "border-turqui-600 bg-turqui-50 text-turqui-700" : "border-slate-200 text-slate-500"
              }`}
            >
              {c.firstName} {c.lastName}
            </button>
          ))}
        </div>
      )}

      {!summary ? (
        <p className="text-sm text-slate-400">Cargando informacion...</p>
      ) : (
        <>
          <div className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {summary.player.firstName} {summary.player.lastName}
              </h2>
              <p className="text-sm text-slate-500">
                {summary.player.category ?? "Sin categoria"} {summary.player.team ? `· ${summary.player.team}` : ""}
              </p>
            </div>
            <Badge tone={statusBadge("player", summary.player.status).tone}>{statusBadge("player", summary.player.status).label}</Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="card">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Dumbbell className="h-4 w-4 text-turqui-600" /> Proximo entrenamiento
              </h3>
              {summary.nextTraining ? (
                <p className="text-sm text-slate-600">
                  {fmtDate(summary.nextTraining.date)} · {summary.nextTraining.startTime}
                  {summary.nextTraining.location ? ` · ${summary.nextTraining.location}` : ""}
                </p>
              ) : (
                <p className="text-sm text-slate-400">No hay entrenamientos programados.</p>
              )}
            </div>

            <div className="card">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Trophy className="h-4 w-4 text-choles-red" /> Proximo partido
              </h3>
              {summary.nextMatch ? (
                <p className="text-sm text-slate-600">
                  {fmtDate(summary.nextMatch.date)} vs {summary.nextMatch.opponentName} (
                  {summary.nextMatch.isHome ? "Local" : "Visitante"})
                </p>
              ) : (
                <p className="text-sm text-slate-400">No hay partidos programados.</p>
              )}
            </div>

            <div className="card">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ClipboardList className="h-4 w-4 text-turqui-600" /> Asistencia
              </h3>
              <p className="text-2xl font-bold text-slate-800">
                {summary.attendancePercentage !== null ? `${summary.attendancePercentage}%` : "Sin datos"}
              </p>
              <p className="text-xs text-slate-400">Ultimas 20 sesiones registradas</p>
            </div>

            <div className="card">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Wallet className="h-4 w-4 text-choles-red" /> Estado de pagos
              </h3>
              {summary.payments.totalDebt > 0 ? (
                <>
                  <p className="text-lg font-bold text-slate-800">{fmtMoney(summary.payments.totalDebt)}</p>
                  <p className="text-xs text-slate-400">
                    {summary.payments.overdueCount} vencido(s) · {summary.payments.pendingCount} pendiente(s)
                  </p>
                </>
              ) : (
                <p className="text-sm text-green-700">Al dia, sin pagos pendientes.</p>
              )}
              <Link href="/pagos" className="mt-2 inline-flex items-center gap-1 text-xs text-turqui-600 hover:underline">
                Ver detalle y recibos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link href="/calendario" className="card flex items-center gap-3 transition hover:shadow-md">
              <Calendar className="h-5 w-5 text-turqui-600" />
              <span className="text-sm font-medium text-slate-700">Calendario completo</span>
            </Link>
            <Link href="/rendimiento" className="card flex items-center gap-3 transition hover:shadow-md">
              <LineChart className="h-5 w-5 text-turqui-600" />
              <span className="text-sm font-medium text-slate-700">Rendimiento y evaluaciones</span>
            </Link>
            <Link href="/comunicaciones" className="card flex items-center gap-3 transition hover:shadow-md">
              <Bell className="h-5 w-5 text-turqui-600" />
              <span className="text-sm font-medium text-slate-700">Comunicados del club</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
