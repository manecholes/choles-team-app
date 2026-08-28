"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, ClipboardCheck, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge } from "@/components/Badge";

interface Training {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  objective: string | null;
  team: { id: number; name: string };
  _count: { attendance: number };
}

const emptyForm = {
  teamId: "" as string | number,
  date: "",
  startTime: "16:00",
  endTime: "17:30",
  location: "",
  objective: "",
  content: "",
  durationMinutes: 90,
};

export default function EntrenamientosPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const [trainingsRes, teamsRes] = await Promise.all([fetch("/api/trainings"), fetch("/api/teams")]);
    setTrainings((await trainingsRes.json()).trainings ?? []);
    setTeams((await teamsRes.json()).teams ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el entrenamiento");
        return;
      }
      setModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: Training) {
    if (!confirm("¿Eliminar este entrenamiento? Se perdera la asistencia registrada.")) return;
    const res = await fetch(`/api/trainings/${t.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    await loadData();
  }

  const now = new Date();
  const columns: Column<Training>[] = [
    {
      key: "date",
      header: "Fecha",
      render: (t) => (
        <div>
          <p className="font-medium">{new Date(t.date).toLocaleDateString("es-CO")}</p>
          <p className="text-xs text-slate-400">
            {t.startTime} - {t.endTime}
          </p>
        </div>
      ),
    },
    { key: "team", header: "Equipo", render: (t) => t.team.name, searchValue: (t) => t.team.name },
    { key: "location", header: "Lugar", render: (t) => t.location ?? "-" },
    { key: "objective", header: "Objetivo", render: (t) => t.objective ?? "-" },
    {
      key: "status",
      header: "Estado",
      render: (t) =>
        new Date(t.date) > now ? (
          <Badge tone="gray">Programado</Badge>
        ) : t._count.attendance > 0 ? (
          <Badge tone="green">Asistencia registrada</Badge>
        ) : (
          <Badge tone="yellow">Pendiente de asistencia</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (t) => (
        <div className="flex gap-2">
          <Link href={`/entrenamientos/${t.id}`} className="btn-primary">
            <ClipboardCheck className="h-4 w-4" /> Asistencia
          </Link>
          <button className="btn-ghost text-choles-red" onClick={() => handleDelete(t)}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Entrenamientos</h1>
        <p className="text-sm text-slate-500">Programa entrenamientos y registra la asistencia de cada equipo.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={trainings}
          searchPlaceholder="Buscar por equipo..."
          actions={
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo entrenamiento
            </button>
          }
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo entrenamiento">
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Fecha</label>
              <input type="date" required className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="label">Hora inicio</label>
              <input type="time" required className="input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div>
              <label className="label">Hora fin</label>
              <input type="time" required className="input" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Lugar</label>
              <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <label className="label">Duracion (min)</label>
              <input
                type="number"
                className="input"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className="label">Objetivo</label>
            <input className="input" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} />
          </div>
          <div>
            <label className="label">Contenido</label>
            <textarea className="input" rows={2} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
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
