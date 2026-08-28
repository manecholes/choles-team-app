"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, FileSpreadsheet, FileDown, ArrowRight } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";

interface ReportOption {
  type: string;
  label: string;
  needsDateRange: boolean;
  needsCategory: boolean;
  needsTeam: boolean;
}

const REPORTS: ReportOption[] = [
  { type: "players", label: "Jugadores activos", needsDateRange: false, needsCategory: true, needsTeam: true },
  { type: "players-by-category", label: "Jugadores por categoria", needsDateRange: false, needsCategory: false, needsTeam: false },
  { type: "attendance", label: "Asistencia", needsDateRange: true, needsCategory: false, needsTeam: true },
  { type: "revenue", label: "Ingresos", needsDateRange: true, needsCategory: false, needsTeam: false },
  { type: "payments", label: "Pagos", needsDateRange: true, needsCategory: false, needsTeam: false },
  { type: "statistics", label: "Estadisticas deportivas", needsDateRange: false, needsCategory: false, needsTeam: true },
  { type: "evaluations", label: "Evaluaciones", needsDateRange: true, needsCategory: false, needsTeam: false },
  { type: "matches", label: "Partidos", needsDateRange: true, needsCategory: false, needsTeam: true },
  { type: "tournaments", label: "Torneos", needsDateRange: false, needsCategory: false, needsTeam: false },
];

interface ReportData {
  title: string;
  columns: Array<{ header: string; key: string }>;
  rows: Record<string, unknown>[];
}

export default function ReportesPage() {
  const [selected, setSelected] = useState<ReportOption>(REPORTS[0]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [catRes, teamRes] = await Promise.all([fetch("/api/categories"), fetch("/api/teams")]);
      setCategories((await catRes.json()).categories ?? []);
      setTeams((await teamRes.json()).teams ?? []);
    })();
  }, []);

  function buildQuery() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (categoryId) params.set("categoryId", categoryId);
    if (teamId) params.set("teamId", teamId);
    return params;
  }

  async function handlePreview() {
    setLoading(true);
    setData(null);
    const params = buildQuery();
    params.set("format", "json");
    const res = await fetch(`/api/reports/${selected.type}?${params.toString()}`);
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }

  function exportUrl(format: string) {
    const params = buildQuery();
    params.set("format", format);
    return `/api/reports/${selected.type}?${params.toString()}`;
  }

  const columns: Column<Record<string, unknown>>[] =
    data?.columns.map((c) => ({ key: c.key, header: c.header, render: (row) => String(row[c.key] ?? "-") })) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Reportes</h1>
        <p className="text-sm text-slate-500">Genera y exporta reportes del club en PDF, Excel o CSV.</p>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3 bg-turqui-50/50">
        <p className="text-sm text-slate-600">
          El detalle de cartera y morosidad tiene su propio panel con filtros dedicados.
        </p>
        <Link href="/cartera" className="btn-secondary">
          Ir a Cartera <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="card space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="label">Tipo de reporte</label>
            <select
              className="input"
              value={selected.type}
              onChange={(e) => {
                setSelected(REPORTS.find((r) => r.type === e.target.value)!);
                setData(null);
              }}
            >
              {REPORTS.map((r) => (
                <option key={r.type} value={r.type}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {selected.needsDateRange && (
            <>
              <div>
                <label className="label">Desde</label>
                <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="label">Hasta</label>
                <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}
          {selected.needsCategory && (
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
          )}
          {selected.needsTeam && (
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
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={handlePreview} disabled={loading}>
            {loading ? "Cargando..." : "Ver reporte"}
          </button>
          <a className="btn-secondary" href={exportUrl("pdf")} target="_blank">
            <FileText className="h-4 w-4" /> PDF
          </a>
          <a className="btn-secondary" href={exportUrl("xlsx")}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </a>
          <a className="btn-secondary" href={exportUrl("csv")}>
            <FileDown className="h-4 w-4" /> CSV
          </a>
        </div>
      </div>

      {data && (
        <DataTable
          columns={columns}
          rows={data.rows}
          searchPlaceholder="Buscar en el reporte..."
          emptyMessage="No hay datos para los filtros seleccionados."
        />
      )}
    </div>
  );
}
