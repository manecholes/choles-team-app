"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge, statusBadge } from "@/components/Badge";

interface Coach {
  id: number;
  firstName: string;
  lastName: string;
}

interface Category {
  id: number;
  name: string;
  minAge: number;
  maxAge: number;
  branch: "MASCULINO" | "FEMENINO" | "MIXTO";
  schedule: string | null;
  court: string | null;
  status: "ACTIVE" | "INACTIVE";
  coach: Coach | null;
  _count: { players: number; teams: number };
}

const BRANCH_LABEL: Record<string, string> = { MASCULINO: "Masculino", FEMENINO: "Femenino", MIXTO: "Mixto" };

interface CategoryForm {
  name: string;
  minAge: number;
  maxAge: number;
  branch: "MASCULINO" | "FEMENINO" | "MIXTO";
  coachId: string | number;
  schedule: string;
  court: string;
  status: "ACTIVE" | "INACTIVE";
}

const emptyForm: CategoryForm = {
  name: "",
  minAge: 8,
  maxAge: 10,
  branch: "MIXTO",
  coachId: "",
  schedule: "",
  court: "",
  status: "ACTIVE",
};

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const [catsRes, coachesRes] = await Promise.all([fetch("/api/categories"), fetch("/api/coaches")]);
    const catsData = await catsRes.json();
    const coachesData = await coachesRes.json();
    setCategories(catsData.categories ?? []);
    setCoaches(coachesData.coaches ?? []);
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

  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({
      name: cat.name,
      minAge: cat.minAge,
      maxAge: cat.maxAge,
      branch: cat.branch,
      coachId: cat.coach?.id ?? "",
      schedule: cat.schedule ?? "",
      court: cat.court ?? "",
      status: cat.status,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, coachId: form.coachId || null };
      const res = await fetch(editing ? `/api/categories/${editing.id}` : "/api/categories", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar la categoria");
        return;
      }
      setModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`¿Eliminar la categoria "${cat.name}"? Esta accion no se puede deshacer.`)) return;
    const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    await loadData();
  }

  const columns: Column<Category>[] = [
    { key: "name", header: "Categoria", render: (c) => <span className="font-medium">{c.name}</span>, searchValue: (c) => c.name },
    { key: "age", header: "Edad", render: (c) => `${c.minAge} - ${c.maxAge} anos` },
    { key: "branch", header: "Rama", render: (c) => BRANCH_LABEL[c.branch] },
    { key: "coach", header: "Entrenador", render: (c) => (c.coach ? `${c.coach.firstName} ${c.coach.lastName}` : "-") },
    { key: "schedule", header: "Horario", render: (c) => c.schedule ?? "-" },
    { key: "court", header: "Cancha", render: (c) => c.court ?? "-" },
    { key: "players", header: "Jugadores", render: (c) => c._count.players },
    {
      key: "status",
      header: "Estado",
      render: (c) => {
        const b = statusBadge("category", c.status);
        return <Badge tone={b.tone}>{b.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => openEdit(c)}>
            <Pencil className="h-4 w-4" />
          </button>
          <button className="btn-ghost text-choles-red" onClick={() => handleDelete(c)}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Categorias</h1>
          <p className="text-sm text-slate-500">Configura las categorias deportivas del club.</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={categories}
          searchPlaceholder="Buscar categoria..."
          actions={
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nueva categoria
            </button>
          }
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar categoria" : "Nueva categoria"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="U12" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Edad minima</label>
              <input type="number" className="input" required value={form.minAge} onChange={(e) => setForm({ ...form, minAge: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Edad maxima</label>
              <input type="number" className="input" required value={form.maxAge} onChange={(e) => setForm({ ...form, maxAge: Number(e.target.value) })} />
            </div>
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
            <label className="label">Horario</label>
            <input className="input" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Lun y Mie 4:00pm - 5:30pm" />
          </div>
          <div>
            <label className="label">Cancha</label>
            <input className="input" value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })} />
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
              <option value="ACTIVE">Activa</option>
              <option value="INACTIVE">Inactiva</option>
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
