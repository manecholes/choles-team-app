"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, Eye, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge, statusBadge } from "@/components/Badge";
import { formatDateCO } from "@/lib/date-format";

interface Tournament {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: "PLANNED" | "IN_PROGRESS" | "FINISHED";
  category: { id: number; name: string } | null;
  _count: { teams: number; matches: number };
}

const emptyForm = { name: "", startDate: "", endDate: "", categoryId: "" as string | number, description: "" };

export default function TorneosPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const [tRes, cRes] = await Promise.all([fetch("/api/tournaments"), fetch("/api/categories")]);
    setTournaments((await tRes.json()).tournaments ?? []);
    setCategories((await cRes.json()).categories ?? []);
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
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, categoryId: form.categoryId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el torneo");
        return;
      }
      setModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: Tournament) {
    if (!confirm(`¿Eliminar el torneo "${t.name}"? Se eliminaran sus partidos y fixture.`)) return;
    await fetch(`/api/tournaments/${t.id}`, { method: "DELETE" });
    await loadData();
  }

  const columns: Column<Tournament>[] = [
    {
      key: "name",
      header: "Torneo",
      render: (t) => (
        <Link href={`/torneos/${t.id}`} className="font-medium text-turqui-700 hover:underline">
          {t.name}
        </Link>
      ),
      searchValue: (t) => t.name,
    },
    { key: "category", header: "Categoria", render: (t) => t.category?.name ?? "Todas" },
    { key: "dates", header: "Fechas", render: (t) => `${formatDateCO(t.startDate)} - ${formatDateCO(t.endDate)}` },
    { key: "teams", header: "Equipos", render: (t) => t._count.teams },
    { key: "matches", header: "Partidos", render: (t) => t._count.matches },
    {
      key: "status",
      header: "Estado",
      render: (t) => {
        const b = statusBadge("tournament", t.status);
        return <Badge tone={b.tone}>{b.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (t) => (
        <div className="flex gap-2">
          <Link href={`/torneos/${t.id}`} className="btn-ghost">
            <Eye className="h-4 w-4" />
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
        <h1 className="text-xl font-bold text-slate-800">Torneos</h1>
        <p className="text-sm text-slate-500">Crea torneos y genera el fixture automaticamente.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={tournaments}
          searchPlaceholder="Buscar torneo..."
          actions={
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo torneo
            </button>
          }
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo torneo">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha inicio</label>
              <input type="date" required className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Fecha fin</label>
              <input type="date" required className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Categoria (opcional)</label>
            <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Todas las categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Descripcion</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
