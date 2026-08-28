"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Ban, KeyRound } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge } from "@/components/Badge";
import { CreateAccessModal } from "@/components/CreateAccessModal";

interface Delegate {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  active: boolean;
  _count: { teams: number };
  user: { id: number; email: string } | null;
}

const emptyForm = { firstName: "", lastName: "", phone: "", email: "", active: true };

export default function DelegadosPage() {
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Delegate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [accessTarget, setAccessTarget] = useState<Delegate | null>(null);

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/delegates");
    const data = await res.json();
    setDelegates(data.delegates ?? []);
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

  function openEdit(d: Delegate) {
    setEditing(d);
    setForm({
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone ?? "",
      email: d.email ?? "",
      active: d.active,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(editing ? `/api/delegates/${editing.id}` : "/api/delegates", {
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

  async function handleDeactivate(d: Delegate) {
    if (!confirm(`¿Marcar a ${d.firstName} ${d.lastName} como inactivo?`)) return;
    await fetch(`/api/delegates/${d.id}`, { method: "DELETE" });
    await loadData();
  }

  const columns: Column<Delegate>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (d) => (
        <span className="font-medium">
          {d.firstName} {d.lastName}
        </span>
      ),
      searchValue: (d) => `${d.firstName} ${d.lastName}`,
    },
    { key: "phone", header: "Telefono", render: (d) => d.phone ?? "-" },
    { key: "email", header: "Correo", render: (d) => d.email ?? "-" },
    { key: "teams", header: "Equipos", render: (d) => d._count.teams },
    {
      key: "status",
      header: "Estado",
      render: (d) => <Badge tone={d.active ? "green" : "gray"}>{d.active ? "Activo" : "Inactivo"}</Badge>,
    },
    {
      key: "access",
      header: "Acceso a la app",
      render: (d) =>
        d.user ? (
          <span className="text-sm text-slate-500">{d.user.email}</span>
        ) : (
          <button className="btn-secondary" onClick={() => setAccessTarget(d)}>
            <KeyRound className="h-4 w-4" /> Crear acceso
          </button>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (d) => (
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => openEdit(d)}>
            <Pencil className="h-4 w-4" />
          </button>
          {d.active && (
            <button className="btn-ghost text-choles-red" onClick={() => handleDeactivate(d)}>
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
        <h1 className="text-xl font-bold text-slate-800">Delegados</h1>
        <p className="text-sm text-slate-500">Gestiona los delegados de categoria/equipo del club.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={delegates}
          searchPlaceholder="Buscar delegado..."
          actions={
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo delegado
            </button>
          }
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar delegado" : "Nuevo delegado"}>
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

      <CreateAccessModal
        open={!!accessTarget}
        onClose={() => setAccessTarget(null)}
        title={`Crear acceso para ${accessTarget?.firstName ?? ""} ${accessTarget?.lastName ?? ""}`}
        endpoint={accessTarget ? `/api/delegates/${accessTarget.id}/user` : ""}
        defaultEmail={accessTarget?.email ?? ""}
        onCreated={loadData}
      />
    </div>
  );
}
