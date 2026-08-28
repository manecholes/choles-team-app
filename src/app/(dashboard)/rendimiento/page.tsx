"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2, Activity, LineChart as LineChartIcon } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { can } from "@/lib/permissions";
import {
  MetricEvolutionChart,
  LoadEvolutionChart,
  AttendanceEvolutionChart,
  LoadSemaphore,
} from "@/components/charts/PerformanceCharts";

interface PlayerOption {
  id: number;
  firstName: string;
  lastName: string;
}

interface TestRow {
  category: string;
  testName: string;
  value: string;
  unit: string;
}

const TEST_CATALOG: Record<string, Array<{ testName: string; unit: string }>> = {
  ANTHROPOMETRY: [
    { testName: "Peso", unit: "kg" },
    { testName: "Altura", unit: "cm" },
    { testName: "IMC", unit: "kg/m2" },
    { testName: "Envergadura", unit: "cm" },
  ],
  SPEED: [
    { testName: "10m", unit: "s" },
    { testName: "20m", unit: "s" },
  ],
  AGILITY: [
    { testName: "T-Test", unit: "s" },
    { testName: "5-10-5", unit: "s" },
    { testName: "Illinois", unit: "s" },
  ],
  JUMP: [
    { testName: "Salto vertical", unit: "cm" },
    { testName: "CMJ", unit: "cm" },
  ],
  ENDURANCE: [
    { testName: "Yo-Yo", unit: "m" },
    { testName: "30-15 VIFT", unit: "km/h" },
  ],
  STRENGTH: [{ testName: "Prueba de fuerza", unit: "kg" }],
};

const CATEGORY_LABEL: Record<string, string> = {
  ANTHROPOMETRY: "Antropometria",
  SPEED: "Velocidad",
  AGILITY: "Agilidad",
  JUMP: "Salto",
  ENDURANCE: "Resistencia",
  STRENGTH: "Fuerza",
};

const emptyLoadForm = { rpe: "7", durationMinutes: "60" };

export default function RendimientoPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [ownPlayerId, setOwnPlayerId] = useState<number | null>(null);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [evalDate, setEvalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [evalNotes, setEvalNotes] = useState("");
  const [testRows, setTestRows] = useState<TestRow[]>([]);
  const [savingEval, setSavingEval] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  const [loadForm, setLoadForm] = useState(emptyLoadForm);
  const [savingLoad, setSavingLoad] = useState(false);

  const canWrite = role ? can(role, "evaluations:write") || can(role, "evaluations:write_own") : false;
  const canPickAnyPlayer = role ? can(role, "players:read") : false;

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      const userRole: UserRole = me.user.role;
      setRole(userRole);

      if (can(userRole, "players:read")) {
        const res = await fetch("/api/players");
        const data = await res.json();
        const opts: PlayerOption[] = (data.players ?? []).map((p: any) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
        }));
        setPlayers(opts);
        if (opts.length > 0) setSelectedPlayerId(opts[0].id);
      } else if (userRole === "GUARDIAN") {
        const res = await fetch("/api/guardians/me/children");
        const data = await res.json();
        setPlayers(data.children ?? []);
        if (data.children?.length > 0) setSelectedPlayerId(data.children[0].id);
      } else if (userRole === "PLAYER" && me.user.playerId) {
        setOwnPlayerId(me.user.playerId);
        setSelectedPlayerId(me.user.playerId);
      }
      setLoading(false);
    })();
  }, []);

  async function loadProfile(playerId: number) {
    setLoadingProfile(true);
    const res = await fetch(`/api/players/${playerId}/performance`);
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
    } else {
      setProfile(null);
    }
    setLoadingProfile(false);
  }

  useEffect(() => {
    if (selectedPlayerId) loadProfile(selectedPlayerId);
  }, [selectedPlayerId]);

  function addTestRow(category: string, testName: string, unit: string) {
    if (testRows.some((t) => t.testName === testName)) return;
    setTestRows([...testRows, { category, testName, value: "", unit }]);
  }

  function updateTestValue(testName: string, value: string) {
    setTestRows((rows) => rows.map((r) => (r.testName === testName ? { ...r, value } : r)));
  }

  function removeTestRow(testName: string) {
    setTestRows((rows) => rows.filter((r) => r.testName !== testName));
  }

  async function handleSubmitEvaluation(e: FormEvent) {
    e.preventDefault();
    if (!selectedPlayerId) return;
    const filled = testRows.filter((t) => t.value !== "");
    if (filled.length === 0) {
      setEvalError("Ingresa al menos un valor de prueba");
      return;
    }
    setSavingEval(true);
    setEvalError(null);
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          date: evalDate,
          notes: evalNotes || null,
          tests: filled.map((t) => ({ category: t.category, testName: t.testName, value: t.value, unit: t.unit })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEvalError(data.error ?? "No se pudo guardar la evaluacion");
        return;
      }
      setTestRows((rows) => rows.map((r) => ({ ...r, value: "" })));
      setEvalNotes("");
      await loadProfile(selectedPlayerId);
    } finally {
      setSavingEval(false);
    }
  }

  async function handleSubmitLoad(e: FormEvent) {
    e.preventDefault();
    if (!selectedPlayerId) return;
    setSavingLoad(true);
    try {
      await fetch("/api/load-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          date: new Date().toISOString(),
          rpe: loadForm.rpe,
          durationMinutes: loadForm.durationMinutes,
        }),
      });
      setLoadForm(emptyLoadForm);
      await loadProfile(selectedPlayerId);
    } finally {
      setSavingLoad(false);
    }
  }

  const selectedPlayerLabel = useMemo(() => {
    const p = players.find((x) => x.id === selectedPlayerId);
    return p ? `${p.firstName} ${p.lastName}` : "";
  }, [players, selectedPlayerId]);

  if (loading) return <p className="text-sm text-slate-400">Cargando...</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Rendimiento</h1>
        <p className="text-sm text-slate-500">Evaluaciones fisicas, carga de entrenamiento y perfil de rendimiento.</p>
      </div>

      {(canPickAnyPlayer || role === "GUARDIAN") && (
        <div className="card">
          <label className="label">Jugador</label>
          <select
            className="input max-w-sm"
            value={selectedPlayerId ?? ""}
            onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
        </div>
      )}

      {!selectedPlayerId && (
        <div className="card text-sm text-slate-400">No hay un jugador disponible para mostrar.</div>
      )}

      {selectedPlayerId && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {canWrite && (
            <div className="space-y-4 lg:col-span-1">
              <div className="card">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Plus className="h-4 w-4" /> Nueva evaluacion fisica
                </h2>
                <form onSubmit={handleSubmitEvaluation} className="space-y-3">
                  <div>
                    <label className="label">Fecha</label>
                    <input type="date" className="input" value={evalDate} onChange={(e) => setEvalDate(e.target.value)} />
                  </div>

                  {Object.entries(TEST_CATALOG).map(([category, tests]) => (
                    <div key={category}>
                      <p className="mb-1 text-xs font-semibold uppercase text-slate-400">{CATEGORY_LABEL[category]}</p>
                      <div className="flex flex-wrap gap-1">
                        {tests.map((t) => {
                          const active = testRows.some((r) => r.testName === t.testName);
                          return (
                            <button
                              type="button"
                              key={t.testName}
                              onClick={() => addTestRow(category, t.testName, t.unit)}
                              disabled={active}
                              className={`rounded-full border px-2 py-1 text-xs ${
                                active ? "border-turqui-200 bg-turqui-50 text-turqui-400" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {t.testName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {testRows.length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      {testRows.map((t) => (
                        <div key={t.testName} className="flex items-center gap-2">
                          <span className="w-28 shrink-0 text-xs text-slate-500">{t.testName}</span>
                          <input
                            type="number"
                            step="any"
                            className="input"
                            placeholder={t.unit}
                            value={t.value}
                            onChange={(e) => updateTestValue(t.testName, e.target.value)}
                          />
                          <button type="button" className="btn-ghost text-choles-red" onClick={() => removeTestRow(t.testName)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="label">Observaciones</label>
                    <textarea className="input min-h-[70px]" value={evalNotes} onChange={(e) => setEvalNotes(e.target.value)} />
                  </div>

                  {evalError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{evalError}</p>}
                  <button type="submit" disabled={savingEval} className="btn-primary w-full">
                    {savingEval ? "Guardando..." : "Guardar evaluacion"}
                  </button>
                </form>
              </div>

              <div className="card">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Activity className="h-4 w-4" /> Carga interna (RPE)
                </h2>
                <form onSubmit={handleSubmitLoad} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">RPE (0-10)</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        className="input"
                        value={loadForm.rpe}
                        onChange={(e) => setLoadForm({ ...loadForm, rpe: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Duracion (min)</label>
                      <input
                        type="number"
                        min={1}
                        className="input"
                        value={loadForm.durationMinutes}
                        onChange={(e) => setLoadForm({ ...loadForm, durationMinutes: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Carga = RPE x duracion = {(Number(loadForm.rpe) || 0) * (Number(loadForm.durationMinutes) || 0)}
                  </p>
                  <button type="submit" disabled={savingLoad} className="btn-secondary w-full">
                    {savingLoad ? "Guardando..." : "Registrar carga"}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className={`space-y-4 ${canWrite ? "lg:col-span-2" : "lg:col-span-3"}`}>
            {loadingProfile || !profile ? (
              <p className="text-sm text-slate-400">Cargando perfil de rendimiento...</p>
            ) : (
              <>
                <div className="card">
                  <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <LineChartIcon className="h-4 w-4" /> Perfil de {selectedPlayerLabel || `${profile.player.firstName} ${profile.player.lastName}`}
                  </h2>
                  <p className="mb-3 text-xs text-slate-400">
                    Asistencia general: {profile.overallAttendance !== null ? `${profile.overallAttendance}%` : "sin datos"}
                  </p>
                  <LoadSemaphore status={profile.status} ratio={profile.acwr.ratio} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="card">
                    <h3 className="mb-2 text-sm font-semibold text-slate-700">Carga de entrenamiento</h3>
                    <LoadEvolutionChart data={profile.loadPoints} />
                  </div>
                  <div className="card">
                    <h3 className="mb-2 text-sm font-semibold text-slate-700">Asistencia (por semana)</h3>
                    <AttendanceEvolutionChart data={profile.attendanceByWeek} />
                  </div>
                </div>

                {profile.metricSeries.length === 0 ? (
                  <div className="card text-sm text-slate-400">Aun no hay evaluaciones fisicas registradas para este jugador.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {profile.metricSeries.map((s: any) => (
                      <div key={s.key} className="card">
                        <h3 className="mb-2 text-sm font-semibold text-slate-700">{s.label}</h3>
                        <MetricEvolutionChart data={s.points} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
