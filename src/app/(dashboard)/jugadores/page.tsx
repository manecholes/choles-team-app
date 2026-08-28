"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, Eye, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge, statusBadge } from "@/components/Badge";

interface Category {
  id: number;
  name: string;
}

interface Player {
  id: number;
  firstName: string;
  lastName: string;
  documentId: string | null;
  sex: "M" | "F";
  status: "ACTIVE" | "INACTIVE" | "INJURED" | "SUSPENDED";
  category: Category | null;
  teamPlayers: Array<{ team: { id: number; name: string } }>;
}

const emptyForm = {
  firstName: "",
  lastName: "",
  documentId: "",
  birthDate: "",
  sex: "M" as "M" | "F",
  phone: "",
  address: "",
  eps: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  categoryId: "" as string | number,
  position: "",
  heightCm: "",
  weightKg: "",
  status: "ACTIVE" as Player["status"],
  observations: "",
};

export default function JugadoresPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const [playersRes, catsRes] = await Promise.all([fetch("/api/players"), fetch("/api/categories")]);
    setPlayers((await playersRes.json()).players ?? []);
    setCategories((await catsRes.json()).categories ?? []);
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
      const payload = {
        ...form,
        categoryId: form.categoryId || null,
        heightCm: form.heightCm || null,
        weightKg: form.weightKg || null,
      };
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el jugador");
        return;
      }
      setModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Player) {
    if (!confirm(`¿Eliminar a ${p.firstName} ${p.lastName}? Se eliminaran tambien sus pagos, asistencia y estadisticas.`)) return;
    const res = await fetch(`/api/players/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    await loadData();
  }

  const columns: Column<Player>[] = [
    {
      key: "name",
      header: "Jugador",
      render: (p) => (
        <Link href={`/jugadores/${p.id}`} className="font-medium text-turqui-700 hover:underline">
          {p.firstName} {p.lastName}
        </Link>
      ),
      searchValue: (p) => `${p.firstName} ${p.lastName} ${p.documentId ?? ""}`,
    },
    { key: "document", header: "Documento", render: (p) => p.documentId ?? "-" },
    { key: "category", header: "Categoria", render: (p) => p.category?.name ?? "-" },
    { key: "team", header: "Equipo", render: (p) => p.teamPlayers[0]?.team.name ?? "-" },
    { key: "sex", header: "Sexo", render: (p) => (p.sex === "M" ? "Masculino" : "Femenino") },
    {
      key: "status",
      header: "Estado",
      render: (p) => {
        const b = statusBadge("player", p.status);
        return <Badge tone={b.tone}>{b.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex gap-2">
          <Link href={`/jugadores/${p.id}`} className="btn-ghost">
            <Eye className="h-4 w-4" />
          </Link>
          <button className="btn-ghost text-choles-red" onClick={() => handleDelete(p)}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Jugadores</h1>
        <p className="text-sm text-slate-500">Gestiona la informacion deportiva y personal de los jugadores.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={players}
          searchPlaceholder="Buscar por nombre o documento..."
          actions={
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo jugador
            </button>
          }
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo jugador" widthClass="max-w-2xl">
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Documento</label>
              <input className="input" value={form.documentId} onChange={(e) => setForm({ ...form, documentId: e.target.value })} />
            </div>
            <div>
              <label className="label">Fecha de nacimiento</label>
              <input type="date" required className="input" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Sexo</label>
              <select className="input" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value as "M" | "F" })}>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Telefono</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">EPS</label>
              <input className="input" value={form.eps} onChange={(e) => setForm({ ...form, eps: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Direccion</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contacto de emergencia</label>
              <input className="input" value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} />
            </div>
            <div>
              <label className="label">Telefono de emergencia</label>
              <input className="input" value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Categoria</label>
              <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Sin asignar</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Posicion</label>
              <input className="input" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Base, Alero..." />
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Player["status"] })}>
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
                <option value="INJURED">Lesionado</option>
                <option value="SUSPENDED">Suspendido</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Altura (cm)</label>
              <input type="number" step="0.1" className="input" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
            </div>
            <div>
              <label className="label">Peso (kg)</label>
              <input type="number" step="0.1" className="input" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Observaciones</label>
            <textarea className="input" rows={3} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <p className="text-xs text-slate-400">
            Despues de crear al jugador podras vincular a sus padres/tutores desde la pestana &ldquo;Familia&rdquo; en su perfil.
          </p>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
