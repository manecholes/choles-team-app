"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock, X, FileWarning } from "lucide-react";
import Link from "next/link";

type Status = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

interface RosterEntry {
  player: { id: number; firstName: string; lastName: string; photoUrl: string | null };
  jerseyNumber: number | null;
  attendance: { status: Status; note: string | null } | null;
}

const STATUS_CONFIG: Record<Status, { label: string; icon: any; activeClass: string }> = {
  PRESENT: { label: "Presente", icon: Check, activeClass: "bg-green-600 text-white border-green-600" },
  LATE: { label: "Tarde", icon: Clock, activeClass: "bg-yellow-500 text-white border-yellow-500" },
  ABSENT: { label: "Ausente", icon: X, activeClass: "bg-choles-red text-white border-choles-red" },
  EXCUSED: { label: "Justificado", icon: FileWarning, activeClass: "bg-slate-500 text-white border-slate-500" },
};

export default function TrainingAttendancePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [statuses, setStatuses] = useState<Record<number, Status>>({});
  const [rpeByPlayer, setRpeByPlayer] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/trainings/${params.id}`);
    const data = await res.json();
    setSession(data.session);
    setRoster(data.roster ?? []);
    const initial: Record<number, Status> = {};
    for (const r of data.roster ?? []) {
      initial[r.player.id] = r.attendance?.status ?? "PRESENT";
    }
    setStatuses(initial);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  function setStatus(playerId: number, status: Status) {
    setStatuses((s) => ({ ...s, [playerId]: status }));
    setSaved(false);
  }

  function markAll(status: Status) {
    const next: Record<number, Status> = {};
    for (const r of roster) next[r.player.id] = status;
    setStatuses(next);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const records = roster.map((r) => ({
        playerId: r.player.id,
        status: statuses[r.player.id] ?? "PRESENT",
        rpe: rpeByPlayer[r.player.id],
      }));
      const res = await fetch(`/api/trainings/${params.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });
      if (res.ok) {
        setSaved(true);
      } else {
        const data = await res.json();
        alert(data.error ?? "No se pudo guardar la asistencia");
      }
    } finally {
      setSaving(false);
    }
  }

  const presentCount = Object.values(statuses).filter((s) => s === "PRESENT" || s === "LATE").length;
  const pct = roster.length > 0 ? Math.round((presentCount / roster.length) * 1000) / 10 : 0;

  if (loading) return <p className="text-sm text-slate-400">Cargando...</p>;

  return (
    <div className="space-y-4 pb-20">
      <Link href="/entrenamientos" className="inline-flex items-center gap-1 text-sm text-turqui-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a entrenamientos
      </Link>

      <div className="card">
        <h1 className="text-lg font-bold text-slate-800">{session.team.name}</h1>
        <p className="text-sm text-slate-500">
          {new Date(session.date).toLocaleDateString("es-CO")} - {session.startTime} a {session.endTime}
        </p>
        <p className="mt-1 text-sm">
          Asistencia actual: <span className="font-bold text-turqui-700">{pct}%</span> ({presentCount}/{roster.length})
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={() => markAll("PRESENT")}>
          Marcar todos presentes
        </button>
      </div>

      <div className="space-y-2">
        {roster.map((r) => {
          const current = statuses[r.player.id] ?? "PRESENT";
          return (
            <div key={r.player.id} className="card flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-turqui-100 text-xs font-bold text-turqui-700">
                  {r.jerseyNumber ?? "-"}
                </span>
                <span className="font-medium text-slate-700">
                  {r.player.firstName} {r.player.lastName}
                </span>
              </div>
              <div className="flex gap-1.5">
                {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  const Icon = cfg.icon;
                  const active = current === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(r.player.id, s)}
                      title={cfg.label}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                        active ? cfg.activeClass : "border-slate-200 text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {roster.length === 0 && (
          <div className="card">
            <p className="text-sm text-slate-400">Este equipo no tiene jugadores asignados.</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-3 md:pl-64">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          {saved && <span className="text-sm text-green-600">Asistencia guardada</span>}
          <button className="btn-primary ml-auto" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar asistencia"}
          </button>
        </div>
      </div>
    </div>
  );
}
