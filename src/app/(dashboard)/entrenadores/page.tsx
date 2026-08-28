"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Ban } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge } from "@/components/Badge";

interface Coach {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  specialty: string | null;
  active: boolean;
  _count: { teams: number; categories: number };
}

const emptyForm = { firstName: "", lastName: "", phone: "", email: "", specialty: "", active: true };

export default function EntrenadoresPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coach | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/coaches");
    const data = await res.json();
    setCoaches(data.coaches ?? []);
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

  function openEdit(c: Coach) {
    setEditing(c);
    setForm({
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone ?? "",
      email: c.email ?? "",
      specialty: c.specialty ?? "",
      active: c.active,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(editing ? `/api/coaches/${editing.id}` : "/api/coaches", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar");
        return;
      }
      setModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(c: Coach) {
    if (!confirm(`¿Marcar a ${c.firstName} ${c.lastName} como inactivo?`)) return;
    await fetch(`/api/coaches/${c.id}`, { method: "DELETE" });
    await loadData();
  }

  const columns: Column<Coach>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (c) => (
        <span className="font-medium">
          {c.firstName} {c.lastName}
        </span>
      ),
      searchValue: (c) => `${c.firstName} ${c.lastName}`,
    },
    { key: "specialty", header: "Especialidad", render: (c) => c.specialty ?? "-" },
    { key: "phone", header: "Telefono", render: (c) => c.phone ?? "-" },
    { key: "email", header: "Correo", render: (c) => c.email ?? "-" },
    { key: "teams", header: "Equipos", render: (c) => c._count.teams },
    {
      key: "status",
      header: "Estado",
      render: (c) => <Badge tone={c.active ? "green" : "gray"}>{c.active ? "Activo" : "Inactivo"}</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => openEdit(c)}>
            <Pencil className="h-4 w-4" />
          </button>
          {c.active && (
            <button className="btn-ghost text-choles-red" onClick={() => handleDeactivate(c)}>
              <Ban className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Entrenadores</h1>
        <p className="text-sm text-slate-500">Gestiona el cuerpo tecnico del club.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={coaches}
          searchPlaceholder="Buscar entrenador..."
          actions={
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo entrenador
            </button>
          }
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar entrenador" : "Nuevo entrenador"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombres</label>
              <input className="input" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <label className="label">Apellidos</label>
              <input className="input" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Especialidad</label>
            <input className="input" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Telefono</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Correo</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
