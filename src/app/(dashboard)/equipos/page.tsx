"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge, statusBadge } from "@/components/Badge";

interface Ref {
  id: number;
  name?: string;
  firstName?: string;
  lastName?: string;
}

interface Team {
  id: number;
  name: string;
  branch: string;
  status: "ACTIVE" | "INACTIVE";
  category: Ref;
  coach: Ref | null;
  delegate: Ref | null;
  _count: { teamPlayers: number };
}

const emptyForm = {
  name: "",
  categoryId: "" as string | number,
  branch: "MIXTO" as const,
  coachId: "" as string | number,
  delegateId: "" as string | number,
  status: "ACTIVE" as const,
};

export default function EquiposPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<Ref[]>([]);
  const [coaches, setCoaches] = useState<Ref[]>([]);
  const [delegates, setDelegates] = useState<Ref[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const [teamsRes, catsRes, coachesRes, delegatesRes] = await Promise.all([
      fetch("/api/teams"),
      fetch("/api/categories"),
      fetch("/api/coaches"),
      fetch("/api/delegates"),
    ]);
    setTeams((await teamsRes.json()).teams ?? []);
    setCategories((await catsRes.json()).categories ?? []);
    setCoaches((await coachesRes.json()).coaches ?? []);
    setDelegates((await delegatesRes.json()).delegates ?? []);
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

  function openEdit(team: Team) {
    setEditing(team);
    setForm({
      name: team.name,
      categoryId: team.category.id,
      branch: team.branch as any,
      coachId: team.coach?.id ?? "",
      delegateId: team.delegate?.id ?? "",
      status: team.status,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        coachId: form.coachId || null,
        delegateId: form.delegateId || null,
      };
      const res = await fetch(editing ? `/api/teams/${editing.id}` : "/api/teams", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el equipo");
        return;
      }
      setModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(team: Team) {
    if (!confirm(`¿Eliminar el equipo "${team.name}"?`)) return;
    const res = await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    await loadData();
  }

  const columns: Column<Team>[] = [
    {
      key: "name",
      header: "Equipo",
      render: (t) => (
        <Link href={`/equipos/${t.id}`} className="font-medium text-turqui-700 hover:underline">
          {t.name}
        </Link>
      ),
      searchValue: (t) => t.name,
    },
    { key: "category", header: "Categoria", render: (t) => t.category.name },
    { key: "coach", header: "Entrenador", render: (t) => (t.coach ? `${t.coach.firstName} ${t.coach.lastName}` : "-") },
    { key: "delegate", header: "Delegado", render: (t) => (t.delegate ? `${t.delegate.firstName} ${t.delegate.lastName}` : "-") },
    { key: "players", header: "Jugadores", render: (t) => t._count.teamPlayers },
    {
      key: "status",
      header: "Estado",
      render: (t) => {
        const b = statusBadge("team", t.status);
        return <Badge tone={b.tone}>{b.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (t) => (
        <div className="flex gap-2">
          <Link href={`/equipos/${t.id}`} className="btn-ghost">
            <Eye className="h-4 w-4" />
          </Link>
          <button className="btn-ghost" onClick={() => openEdit(t)}>
            <Pencil className="h-4 w-4" />
          </button>
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
        <h1 className="text-xl font-bold text-slate-800">Equipos</h1>
        <p className="text-sm text-slate-500">Administra los equipos del club por categoria y temporada.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={teams}
          searchPlaceholder="Buscar equipo..."
          actions={
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo equipo
            </button>
          }
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar equipo" : "Nuevo equipo"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Categoria</label>
            <select className="input" required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Selecciona una categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Rama</label>
            <select className="input" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value as any })}>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMENINO">Femenino</option>
              <option value="MIXTO">Mixto</option>
            </select>
          </div>
          <div>
            <label className="label">Entrenador</label>
            <select className="input" value={form.coachId} onChange={(e) => setForm({ ...form, coachId: e.target.value })}>
              <option value="">Sin asignar</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Delegado</label>
            <select className="input" value={form.delegateId} onChange={(e) => setForm({ ...form, delegateId: e.target.value })}>
              <option value="">Sin asignar</option>
              {delegates.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.firstName} {d.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </select>
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
