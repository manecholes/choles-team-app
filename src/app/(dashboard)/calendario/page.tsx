"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";

interface CalendarEvent {
  id: number;
  title: string;
  type: "TRAINING" | "MATCH" | "TOURNAMENT" | "MEETING" | "EVALUATION" | "OTHER";
  startAt: string;
  endAt: string;
  location: string | null;
  description: string | null;
  team: { id: number; name: string } | null;
  trainingSessionId: number | null;
  matchId: number | null;
}

const TYPE_LABEL: Record<string, string> = {
  TRAINING: "Entrenamiento",
  MATCH: "Partido",
  TOURNAMENT: "Torneo",
  MEETING: "Reunion",
  EVALUATION: "Evaluacion",
  OTHER: "Evento",
};

const TYPE_COLOR: Record<string, string> = {
  TRAINING: "bg-turqui-700",
  MATCH: "bg-choles-red",
  TOURNAMENT: "bg-yellow-500",
  MEETING: "bg-slate-500",
  EVALUATION: "bg-green-600",
  OTHER: "bg-slate-400",
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}
function startOfWeek(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
/** yyyy-mm-dd en hora LOCAL (evita el corrimiento de un dia que produce toISOString() en zonas horarias positivas respecto a UTC). */
function toLocalDateInputValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const emptyForm = {
  title: "",
  type: "MEETING" as CalendarEvent["type"],
  date: "",
  startTime: "16:00",
  endTime: "17:00",
  location: "",
  teamId: "" as string | number,
  description: "",
  recurrenceRule: "NONE" as "NONE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY",
  recurrenceCount: 1,
};

export default function CalendarioPage() {
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const rangeStart = useMemo(() => {
    if (view === "month") return startOfMonth(cursor);
    if (view === "week") return startOfWeek(cursor);
    const d = new Date(cursor);
    d.setHours(0, 0, 0, 0);
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, cursor.getFullYear(), cursor.getMonth(), cursor.getDate()]);

  const rangeEnd = useMemo(() => {
    if (view === "month") return endOfMonth(cursor);
    if (view === "week") {
      const d = new Date(startOfWeek(cursor));
      d.setDate(d.getDate() + 7);
      return d;
    }
    const d = new Date(cursor);
    d.setHours(23, 59, 59);
    return d;
  }, [view, cursor]);

  async function loadEvents() {
    setLoading(true);
    const params = new URLSearchParams({ start: rangeStart.toISOString(), end: rangeEnd.toISOString() });
    const [eventsRes, teamsRes] = await Promise.all([fetch(`/api/calendar?${params}`), fetch("/api/teams")]);
    setEvents((await eventsRes.json()).events ?? []);
    setTeams((await teamsRes.json()).teams ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, cursor.getFullYear(), cursor.getMonth(), cursor.getDate()]);

  function openCreate(day?: Date) {
    setError(null);
    setForm({ ...emptyForm, date: toLocalDateInputValue(day ?? new Date()) });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const startAt = new Date(`${form.date}T${form.startTime}:00`);
      const endAt = new Date(`${form.date}T${form.endTime}:00`);
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          startAt,
          endAt,
          location: form.location || null,
          teamId: form.teamId || null,
          description: form.description || null,
          recurrenceRule: form.recurrenceRule,
          recurrenceCount: form.recurrenceCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el evento");
        return;
      }
      setModalOpen(false);
      await loadEvents();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ev: CalendarEvent) {
    if (!confirm(`¿Eliminar el evento "${ev.title}"?`)) return;
    const res = await fetch(`/api/calendar/${ev.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    await loadEvents();
  }

  function navigate(delta: number) {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + delta);
    else if (view === "week") d.setDate(d.getDate() + delta * 7);
    else d.setDate(d.getDate() + delta);
    setCursor(d);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Calendario</h1>
          <p className="text-sm text-slate-500">Entrenamientos, partidos, torneos, reuniones y evaluaciones.</p>
        </div>
        <button className="btn-primary" onClick={() => openCreate()}>
          <Plus className="h-4 w-4" /> Nuevo evento
        </button>
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[180px] text-center font-medium text-slate-700">
              {view === "month"
                ? cursor.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
                : view === "week"
                ? `Semana del ${startOfWeek(cursor).toLocaleDateString("es-CO")}`
                : cursor.toLocaleDateString("es-CO", { dateStyle: "full" })}
            </span>
            <button className="btn-ghost" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </button>
            <button className="btn-secondary ml-2" onClick={() => setCursor(new Date())}>
              Hoy
            </button>
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {(["day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-sm ${view === v ? "bg-white font-medium text-turqui-700 shadow-sm" : "text-slate-500"}`}
              >
                {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : view === "month" ? (
          <MonthView cursor={cursor} events={events} onDayClick={(d) => { setSelectedDay(d); openCreate(d); }} onDelete={handleDelete} />
        ) : view === "week" ? (
          <WeekView cursor={cursor} events={events} onDelete={handleDelete} />
        ) : (
          <DayView cursor={cursor} events={events} onDelete={handleDelete} />
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo evento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Titulo</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
                {Object.entries(TYPE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Equipo (opcional)</label>
              <select className="input" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
                <option value="">Todo el club</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
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
          <div>
            <label className="label">Lugar</label>
            <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <label className="label">Descripcion</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Repeticion</label>
              <select className="input" value={form.recurrenceRule} onChange={(e) => setForm({ ...form, recurrenceRule: e.target.value as any })}>
                <option value="NONE">No se repite</option>
                <option value="WEEKLY">Semanal</option>
                <option value="BIWEEKLY">Quincenal</option>
                <option value="MONTHLY">Mensual</option>
              </select>
            </div>
            {form.recurrenceRule !== "NONE" && (
              <div>
                <label className="label">Numero de repeticiones</label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  className="input"
                  value={form.recurrenceCount}
                  onChange={(e) => setForm({ ...form, recurrenceCount: Number(e.target.value) })}
                />
              </div>
            )}
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

function EventPill({ ev, onDelete }: { ev: CalendarEvent; onDelete: (ev: CalendarEvent) => void }) {
  return (
    <div className={`group flex items-center justify-between gap-1 rounded px-1.5 py-0.5 text-[11px] text-white ${TYPE_COLOR[ev.type]}`}>
      <span className="truncate">{ev.title}</span>
      <button onClick={() => onDelete(ev)} className="hidden group-hover:block">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function MonthView({
  cursor,
  events,
  onDayClick,
  onDelete,
}: {
  cursor: Date;
  events: CalendarEvent[];
  onDayClick: (d: Date) => void;
  onDelete: (ev: CalendarEvent) => void;
}) {
  const first = startOfMonth(cursor);
  const gridStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-7 gap-1 text-sm">
      {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((d) => (
        <div key={d} className="px-1 pb-1 text-center text-xs font-semibold uppercase text-slate-400">
          {d}
        </div>
      ))}
      {days.map((day, i) => {
        const dayEvents = events.filter((ev) => sameDay(new Date(ev.startAt), day));
        const isCurrentMonth = day.getMonth() === cursor.getMonth();
        return (
          <div
            key={i}
            onClick={() => onDayClick(day)}
            className={`min-h-[90px] cursor-pointer rounded-lg border p-1 hover:border-turqui-300 ${
              isCurrentMonth ? "border-slate-100 bg-white" : "border-slate-50 bg-slate-50 text-slate-300"
            } ${sameDay(day, new Date()) ? "ring-2 ring-turqui-300" : ""}`}
          >
            <p className="mb-1 text-xs font-medium">{day.getDate()}</p>
            <div className="space-y-0.5">
              {dayEvents.slice(0, 3).map((ev) => (
                <EventPill key={ev.id} ev={ev} onDelete={onDelete} />
              ))}
              {dayEvents.length > 3 && <p className="text-[10px] text-slate-400">+{dayEvents.length - 3} mas</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekView({ cursor, events, onDelete }: { cursor: Date; events: CalendarEvent[]; onDelete: (ev: CalendarEvent) => void }) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((day, i) => {
        const dayEvents = events
          .filter((ev) => sameDay(new Date(ev.startAt), day))
          .sort((a, b) => a.startAt.localeCompare(b.startAt));
        return (
          <div key={i} className={`rounded-lg border p-2 ${sameDay(day, new Date()) ? "border-turqui-300 bg-turqui-50/40" : "border-slate-100"}`}>
            <p className="mb-2 text-xs font-semibold text-slate-500">
              {day.toLocaleDateString("es-CO", { weekday: "short", day: "numeric" })}
            </p>
            <div className="space-y-1">
              {dayEvents.map((ev) => (
                <EventPill key={ev.id} ev={ev} onDelete={onDelete} />
              ))}
              {dayEvents.length === 0 && <p className="text-[11px] text-slate-300">Sin eventos</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({ cursor, events, onDelete }: { cursor: Date; events: CalendarEvent[]; onDelete: (ev: CalendarEvent) => void }) {
  const dayEvents = events
    .filter((ev) => sameDay(new Date(ev.startAt), cursor))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  return (
    <div className="space-y-2">
      {dayEvents.length === 0 && <p className="text-sm text-slate-400">Sin eventos este dia.</p>}
      {dayEvents.map((ev) => (
        <div key={ev.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${TYPE_COLOR[ev.type]}`} />
            <div>
              <p className="font-medium text-slate-700">{ev.title}</p>
              <p className="text-xs text-slate-400">
                {new Date(ev.startAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} -{" "}
                {new Date(ev.endAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                {ev.location ? ` - ${ev.location}` : ""}
                {ev.team ? ` - ${ev.team.name}` : ""}
              </p>
            </div>
          </div>
          <button className="btn-ghost text-choles-red" onClick={() => onDelete(ev)}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
