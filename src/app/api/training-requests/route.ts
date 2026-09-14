"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, ClipboardCheck, Trash2, CalendarPlus, Check, X as XIcon } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge } from "@/components/Badge";
import { formatDateCO } from "@/lib/date-format";
import { can } from "@/lib/permissions";

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

interface TrainingRequest {
  id: number;
  requestedDate: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  player: { id: number; firstName: string; lastName: string };
}

const emptyRequestForm = {
  requestedDate: "",
  startTime: "16:00",
  endTime: "",
  location: "",
  notes: "",
};

const REQUEST_STATUS: Record<TrainingRequest["status"], { label: string; tone: "green" | "yellow" | "red" }> = {
  PENDING: { label: "Pendiente de aprobacion", tone: "yellow" },
  APPROVED: { label: "Aprobado", tone: "green" },
  REJECTED: { label: "Rechazado", tone: "red" },
};

export default function EntrenamientosPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [role, setRole] = useState<UserRole | null>(null);
  const [requests, setRequests] = useState<TrainingRequest[]>([]);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState(emptyRequestForm);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [savingRequest, setSavingRequest] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const canRequestTraining = role === "PLAYER" && can(role, "training_requests:write_own");
  const canReviewRequests = role ? can(role, "training_requests:review") || can(role, "training_requests:review_own") : false;

  async function loadData() {
    setLoading(true);
    const [trainingsRes, teamsRes] = await Promise.all([fetch("/api/trainings"), fetch("/api/teams")]);
    setTrainings((await trainingsRes.json()).trainings ?? []);
    setTeams((await teamsRes.json()).teams ?? []);
    setLoading(false);
  }

  async function loadRequests() {
    const res = await fetch("/api/training-requests");
    if (res.ok) setRequests((await res.json()).trainingRequests ?? []);
  }

  useEffect(() => {
    loadData();
    (async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setRole(data.user.role);
    })();
  }, []);

  useEffect(() => {
    if (role === "PLAYER" || (role && (can(role, "training_requests:review") || can(role, "training_requests:review_own")))) {
      loadRequests();
    }
  }, [role]);

  function openRequestModal() {
    setRequestForm(emptyRequestForm);
    setRequestError(null);
    setRequestModalOpen(true);
  }

  async function handleSubmitRequest(e: FormEvent) {
    e.preventDefault();
    setSavingRequest(true);
    setRequestError(null);
    try {
      const res = await fetch("/api/training-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setRequestError(data.error ?? "No se pudo enviar la solicitud");
        return;
      }
      setRequestModalOpen(false);
      await loadRequests();
    } finally {
      setSavingRequest(false);
    }
  }

  async function handleReviewRequest(id: number, status: "APPROVED" | "REJECTED") {
    if (status === "REJECTED" && !confirm("¿Rechazar esta solicitud de entrenamiento individual?")) return;
    setReviewingId(id);
    try {
      const res = await fetch(`/api/training-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "No se pudo actualizar la solicitud");
        return;
      }
      await loadRequests();
    } finally {
      setReviewingId(null);
    }
  }

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
          <p className="font-medium">{formatDateCO(t.date)}</p>
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

      {canRequestTraining && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CalendarPlus className="h-4 w-4 text-turqui-600" /> Entrenamiento individual
            </h3>
            <button className="btn-primary" onClick={openRequestModal}>
              <Plus className="h-4 w-4" /> Solicitar entrenamiento
            </button>
          </div>
          <p className="mb-3 text-sm text-slate-500">
            Propon una fecha y hora para practicar por tu cuenta. Tu entrenador o el club deben aprobarla antes de que quede confirmada.
          </p>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-400">Todavia no has solicitado ningun entrenamiento individual.</p>
          ) : (
            <ul className="space-y-2">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {formatDateCO(r.requestedDate)} · {r.startTime}
                      {r.endTime ? ` - ${r.endTime}` : ""}
                      {r.location ? ` · ${r.location}` : ""}
                    </p>
                    {r.notes && <p className="text-xs text-slate-400">{r.notes}</p>}
                    {r.status === "REJECTED" && r.reviewNote && (
                      <p className="text-xs text-choles-red">Motivo: {r.reviewNote}</p>
                    )}
                  </div>
                  <Badge tone={REQUEST_STATUS[r.status].tone}>{REQUEST_STATUS[r.status].label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {canReviewRequests && (
        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarPlus className="h-4 w-4 text-turqui-600" /> Solicitudes de entrenamiento individual
          </h3>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-400">No hay solicitudes de entrenamiento individual todavia.</p>
          ) : (
            <ul className="space-y-2">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {r.player.firstName} {r.player.lastName} · {formatDateCO(r.requestedDate)} · {r.startTime}
                      {r.endTime ? ` - ${r.endTime}` : ""}
                      {r.location ? ` · ${r.location}` : ""}
                    </p>
                    {r.notes && <p className="text-xs text-slate-400">{r.notes}</p>}
                  </div>
                  {r.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <button
                        className="btn-primary"
                        disabled={reviewingId === r.id}
                        onClick={() => handleReviewRequest(r.id, "APPROVED")}
                      >
                        <Check className="h-4 w-4" /> Aprobar
                      </button>
                      <button
                        className="btn-ghost text-choles-red"
                        disabled={reviewingId === r.id}
                        onClick={() => handleReviewRequest(r.id, "REJECTED")}
                      >
                        <XIcon className="h-4 w-4" /> Rechazar
                      </button>
                    </div>
                  ) : (
                    <Badge tone={REQUEST_STATUS[r.status].tone}>{REQUEST_STATUS[r.status].label}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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

      <Modal open={requestModalOpen} onClose={() => setRequestModalOpen(false)} title="Solicitar entrenamiento individual">
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Fecha</label>
              <input
                type="date"
                required
                className="input"
                value={requestForm.requestedDate}
                onChange={(e) => setRequestForm({ ...requestForm, requestedDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Hora inicio</label>
              <input
                type="time"
                required
                className="input"
                value={requestForm.startTime}
                onChange={(e) => setRequestForm({ ...requestForm, startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Hora fin</label>
              <input
                type="time"
                className="input"
                value={requestForm.endTime}
                onChange={(e) => setRequestForm({ ...requestForm, endTime: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Lugar</label>
            <input
              className="input"
              value={requestForm.location}
              onChange={(e) => setRequestForm({ ...requestForm, location: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Notas (opcional)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Ej. quiero practicar tiro libre"
              value={requestForm.notes}
              onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
            />
          </div>
          {requestError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{requestError}</p>}
          <button type="submit" disabled={savingRequest} className="btn-primary w-full">
            {savingRequest ? "Enviando..." : "Enviar solicitud"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
