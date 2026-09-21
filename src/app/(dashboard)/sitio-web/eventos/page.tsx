"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, CalendarDays, UploadCloud } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { formatDateCO } from "@/lib/date-format";

interface ClubEvent {
  id: number;
  title: string;
  description: string | null;
  date: string;
  timeLabel: string | null;
  location: string | null;
  imagePath: string | null;
}

interface EventForm {
  title: string;
  description: string;
  date: string;
  timeLabel: string;
  location: string;
}

const emptyForm: EventForm = { title: "", description: "", date: "", timeLabel: "", location: "" };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SitioWebEventosPage() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClubEvent | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/events");
    const data = await res.json();
    setEvents(data.events ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(ev: ClubEvent) {
    setEditing(ev);
    setForm({
      title: ev.title,
      description: ev.description ?? "",
      date: ev.date.slice(0, 10),
      timeLabel: ev.timeLabel ?? "",
      location: ev.location ?? "",
    });
    setFile(null);
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (file) {
        payload.image = {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          base64Data: await fileToBase64(file),
        };
      }
      const res = await fetch(editing ? `/api/events/${editing.id}` : "/api/events", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el evento");
        return;
      }
      setModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ev: ClubEvent) {
    if (!confirm(`¿Eliminar el evento "${ev.title}"?`)) return;
    const res = await fetch(`/api/events/${ev.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    await loadData();
  }

  const columns: Column<ClubEvent>[] = [
    {
      key: "thumb",
      header: "",
      render: (ev) =>
        ev.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/events/${ev.id}/image`} alt={ev.title} className="h-12 w-16 rounded object-cover" />
        ) : (
          <div className="flex h-12 w-16 items-center justify-center rounded bg-turqui-50 text-turqui-300">
            <CalendarDays className="h-5 w-5" />
          </div>
        ),
    },
    { key: "title", header: "Titulo", render: (ev) => <span className="font-medium">{ev.title}</span>, searchValue: (ev) => ev.title },
    { key: "date", header: "Fecha", render: (ev) => formatDateCO(ev.date, { day: "numeric", month: "short", year: "numeric" }) },
    { key: "time", header: "Hora", render: (ev) => ev.timeLabel ?? "-" },
    { key: "location", header: "Lugar", render: (ev) => ev.location ?? "-" },
    {
      key: "actions",
      header: "",
      render: (ev) => (
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => openEdit(ev)}>
            <Pencil className="h-4 w-4" />
          </button>
          <button className="btn-ghost text-choles-red" onClick={() => handleDelete(ev)}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Eventos del sitio</h1>
        <p className="text-sm text-slate-500">
          Eventos que se muestran en <code>cholesteam.com/eventos</code>, publicos sin necesidad de iniciar sesion.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={events}
          searchPlaceholder="Buscar evento..."
          emptyMessage="Todavia no hay eventos publicados."
          actions={
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo evento
            </button>
          }
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar evento" : "Nuevo evento"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Titulo</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Descripcion (opcional)</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="label">Hora (texto libre)</label>
              <input className="input" placeholder="3:00 pm" value={form.timeLabel} onChange={(e) => setForm({ ...form, timeLabel: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Lugar</label>
            <input className="input" placeholder="Cancha techada, Garupal" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <label className="label">Foto {editing ? "(deja vacio para mantener la actual)" : "(opcional)"}</label>
            <label className="btn-secondary w-full cursor-pointer justify-center">
              <UploadCloud className="h-4 w-4" />
              {file ? file.name : "Elegir imagen"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
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
