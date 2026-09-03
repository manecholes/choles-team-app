"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, AlertTriangle, Users, Wallet } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Badge, statusBadge } from "@/components/Badge";
import { StatCard } from "@/components/StatCard";
import { formatDateCO } from "@/lib/date-format";

interface CarteraRow {
  playerId: number;
  playerName: string;
  category: string;
  team: string;
  debt: number;
  monthsPending: number;
  lastPayment: string | null;
  maxDaysOverdue: number;
  status: "PENDING" | "OVERDUE";
}

interface Category {
  id: number;
  name: string;
}

interface Team {
  id: number;
  name: string;
}

function fmtMoney(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

export default function CarteraPage() {
  const [rows, setRows] = useState<CarteraRow[]>([]);
  const [totals, setTotals] = useState({ totalDebt: 0, players: 0 });
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryId, setCategoryId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [month, setMonth] = useState("");
  const [status, setStatus] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (categoryId) params.set("categoryId", categoryId);
    if (teamId) params.set("teamId", teamId);
    if (month) params.set("month", month);
    if (status) params.set("status", status);
    return params.toString();
  }, [categoryId, teamId, month, status]);

  async function loadCartera() {
    setLoading(true);
    const res = await fetch(`/api/cartera${query ? `?${query}` : ""}`);
    const data = await res.json();
    setRows(data.rows ?? []);
    setTotals(data.totals ?? { totalDebt: 0, players: 0 });
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const [catRes, teamRes] = await Promise.all([fetch("/api/categories"), fetch("/api/teams")]);
      setCategories((await catRes.json()).categories ?? []);
      setTeams((await teamRes.json()).teams ?? []);
    })();
  }, []);

  useEffect(() => {
    loadCartera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const overdueCount = rows.filter((r) => r.status === "OVERDUE").length;

  const columns: Column<CarteraRow>[] = [
    { key: "player", header: "Jugador", render: (r) => r.playerName, searchValue: (r) => r.playerName },
    { key: "category", header: "Categoria", render: (r) => r.category },
    { key: "team", header: "Equipo", render: (r) => r.team },
    { key: "debt", header: "Valor adeudado", render: (r) => fmtMoney(r.debt) },
    { key: "months", header: "Meses pendientes", render: (r) => r.monthsPending },
    { key: "last", header: "Ultimo pago", render: (r) => (r.lastPayment ? formatDateCO(r.lastPayment) : "Nunca") },
    { key: "mora", header: "Dias de mora", render: (r) => (r.maxDaysOverdue > 0 ? r.maxDaysOverdue : "-") },
    {
      key: "status",
      header: "Estado",
      render: (r) => {
        const b = statusBadge("payment", r.status);
        return <Badge tone={b.tone}>{b.label}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Cartera</h1>
          <p className="text-sm text-slate-500">Control de morosidad y pagos pendientes del club.</p>
        </div>
        <a className="btn-secondary" href={`/api/cartera/export${query ? `?${query}` : ""}`}>
          <Download className="h-4 w-4" /> Exportar a Excel
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Deuda total" value={fmtMoney(totals.totalDebt)} icon={Wallet} tone="red" />
        <StatCard label="Jugadores con deuda" value={String(totals.players)} icon={Users} tone="yellow" />
        <StatCard label="En mora (vencidos)" value={String(overdueCount)} icon={AlertTriangle} tone="red" />
      </div>

      <div className="card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="label">Categoria</label>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Equipo</label>
            <select className="input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">Todos</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Mes / periodo</label>
            <input className="input" placeholder="2026-08" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="OVERDUE">Vencido</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          searchPlaceholder="Buscar jugador..."
          emptyMessage="No hay jugadores con pagos pendientes o vencidos."
        />
      )}
    </div>
  );
}
