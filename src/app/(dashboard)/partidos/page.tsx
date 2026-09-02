"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, ListChecks, Pencil, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge, statusBadge } from "@/components/Badge";

/** Convierte una fecha (ISO o Date) al formato yyyy-MM-dd que espera <input type="date">. */
function toDateInputValue(value: string) {
  return value.slice(0, 10);
}

interface MatchRow {
  id: number;
  competition: string | null;
  opponentName: string;
  date: string;
  time: string;
  venue: string | null;
  isHome: boolean;
  status: "SCHEDULED" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";
  resultTeamScore: number | null;
  resultOpponentScore: number | null;
  team: { id: number; name: string };
  tournament: { id: number; name: string } | null;
}

const emptyForm = {
  competition: "Liga Local de Baloncesto",
  teamId: "" as string | number,
  opponentName: "",
  date: "",
  time: "18:00",
  venue: "",
  isHome: true,
  status: "SCHEDULED" as MatchRow["status"],
};

export default function PartidosPage() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MatchRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const [matchesRes, teamsRes] = await Promise.all([fetch("/api/matches"), fetch("/api/teams")]);
    setMatches((await matchesRes.json()).matches ?? []);
    setTeams((await teamsRes.json()).teams ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(m: MatchRow) {
    setEditing(m);
    setForm({
      competition: m.competition ?? "",
      teamId: m.team.id,
      opponentName: m.opponentName,
      date: toDateInputValue(m.date),
      time: m.time,
      venue: m.venue ?? "",
      isHome: m.isHome,
      status: m.status,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(editing ? `/api/matches/${editing.id}` : "/api/matches", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el partido");
        return;
      }
      setModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(m: MatchRow) {
    if (!confirm("¿Eliminar este partido?")) return;
    const res = await fetch(`/api/matches/${m.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    await loadData();
  }

  const columns: Column<MatchRow>[] = [
    {
      key: "date",
      header: "Fecha",
      render: (m) => (
        <div>
          <p className="font-medium">{new Date(m.date).toLocaleDateString("es-CO")}</p>
          <p className="text-xs text-slate-400">{m.time}</p>
        </div>
      ),
    },
    { key: "team", header: "Equipo", render: (m) => m.team.name, searchValue: (m) => m.team.name },
    { key: "opponent", header: "Rival", render: (m) => m.opponentName, searchValue: (m) => m.opponentName },
    { key: "venue", header: "Local/Visitante", render: (m) => (m.isHome ? "Local" : "Visitante") },
    {
      key: "result",
      header: "Resultado",
      render: (m) => (m.resultTeamScore !== null ? `${m.resultTeamScore} - ${m.resultOpponentScore}` : "-"),
    },
    {
      key: "status",
      header: "Estado",
      render: (m) => {
        const b = statusBadge("match", m.status);
        return <Badge tone={b.tone}>{b.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (m) => (
        <div className="flex gap-2">
          <Link href={`/partidos/${m.id}`} className="btn-primary">
            <ListChecks className="h-4 w-4" /> Estadisticas
          </Link>
          <button className="btn-ghost" onClick={() => openEdit(m)} title="Editar partido">
            <Pencil className="h-4 w-4" />
          </button>
          <button className="btn-ghost text-choles-red" onClick={() => handleDelete(m)}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Partidos</h1>
        <p className="text-sm text-slate-500">Programa partidos y registra estadisticas por jugador.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={matches}
          searchPlaceholder="Buscar por equipo o rival..."
          actions={
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo partido
            </button>
          }
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar partido" : "Nuevo partido"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Equipo</label>
            <select className="input" required value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
              <option value="">Selecciona un equipo</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Rival</label>
            <input className="input" required value={form.opponentName} onChange={(e) => setForm({ ...form, opponentName: e.target.value })} />
          </div>
          <div>
            <label className="label">Competencia</label>
            <input className="input" value={form.competition} onChange={(e) => setForm({ ...form, competition: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha</label>
              <input type="date" required className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="label">Hora</label>
              <input type="time" required className="input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cancha</label>
              <input className="input" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </div>
            <div>
              <label className="label">Condicion</label>
              <select className="input" value={form.isHome ? "home" : "away"} onChange={(e) => setForm({ ...form, isHome: e.target.value === "home" })}>
                <option value="home">Local</option>
                <option value="away">Visitante</option>
              </select>
            </div>
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
