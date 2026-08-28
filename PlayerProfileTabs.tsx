"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Download, KeyRound, Plus, Trash2, UploadCloud } from "lucide-react";
import { Badge, statusBadge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { CreateAccessModal } from "@/components/CreateAccessModal";
import { effectiveStatus } from "@/server/logic/cartera";

// Los datos llegan desde un Server Component tras un JSON.parse(JSON.stringify(...)),
// por lo que todas las fechas viajan como strings ISO (no como Date).
export interface PlayerProfileData {
  player: any;
  age: number;
  attendance: any[];
  attendancePercentage: number | null;
  payments: any[];
  matchStats: any[];
  evaluations: any[];
  documents: any[];
  loadEntries: any[];
  currentTeam: { id: number; name: string } | null;
  upcomingTrainings: any[];
}

const TABS = [
  "Informacion",
  "Familia",
  "Asistencia",
  "Pagos",
  "Estadisticas",
  "Evaluaciones fisicas",
  "Entrenamientos",
  "Partidos",
  "Documentos",
  "Observaciones",
] as const;

function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("es-CO");
}

function fmtMoney(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

export function PlayerProfileTabs({
  profile,
  canEdit,
  canManageDocuments,
}: {
  profile: PlayerProfileData;
  canEdit: boolean;
  canManageDocuments: boolean;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Informacion");
  const { player } = profile;
  const statusInfo = statusBadge("player", player.status);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-turqui-100 text-xl font-bold text-turqui-700">
          {player.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photoUrl} alt={player.firstName} className="h-full w-full object-cover" />
          ) : (
            `${player.firstName[0] ?? ""}${player.lastName[0] ?? ""}`
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">
            {player.firstName} {player.lastName}
          </h1>
          <p className="text-sm text-slate-500">
            {profile.age} anos - {player.category?.name ?? "Sin categoria"}
            {profile.currentTeam ? ` - ${profile.currentTeam.name}` : ""}
          </p>
        </div>
        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
      </div>

      <div className="thin-scrollbar flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t ? "border-turqui-700 text-turqui-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Informacion" && <InfoTab profile={profile} canEdit={canEdit} />}
      {tab === "Familia" && <FamiliaTab profile={profile} canEdit={canEdit} />}
      {tab === "Asistencia" && <AsistenciaTab profile={profile} />}
      {tab === "Pagos" && <PagosTab profile={profile} />}
      {tab === "Estadisticas" && <EstadisticasTab profile={profile} />}
      {tab === "Evaluaciones fisicas" && <EvaluacionesTab profile={profile} />}
      {tab === "Entrenamientos" && <EntrenamientosTab profile={profile} />}
      {tab === "Partidos" && <PartidosTab profile={profile} />}
      {tab === "Documentos" && <DocumentosTab profile={profile} canManage={canManageDocuments} />}
      {tab === "Observaciones" && <ObservacionesTab profile={profile} canEdit={canEdit} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Informacion
// ---------------------------------------------------------------------------
function InfoTab({ profile, canEdit }: { profile: PlayerProfileData; canEdit: boolean }) {
  const router = useRouter();
  const { player } = profile;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: player.firstName,
    lastName: player.lastName,
    documentId: player.documentId ?? "",
    birthDate: player.birthDate?.slice(0, 10) ?? "",
    sex: player.sex,
    phone: player.phone ?? "",
    address: player.address ?? "",
    eps: player.eps ?? "",
    emergencyContactName: player.emergencyContactName ?? "",
    emergencyContactPhone: player.emergencyContactPhone ?? "",
    position: player.position ?? "",
    heightCm: player.heightCm ?? "",
    weightKg: player.weightKg ?? "",
    status: player.status,
  });

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          categoryId: player.categoryId,
          heightCm: form.heightCm || null,
          weightKg: form.weightKg || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombres">
            <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field label="Apellidos">
            <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Documento">
            <input className="input" value={form.documentId} onChange={(e) => setForm({ ...form, documentId: e.target.value })} />
          </Field>
          <Field label="Fecha de nacimiento">
            <input type="date" className="input" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          </Field>
          <Field label="Sexo">
            <select className="input" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefono">
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="EPS">
            <input className="input" value={form.eps} onChange={(e) => setForm({ ...form, eps: e.target.value })} />
          </Field>
        </div>
        <Field label="Direccion">
          <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contacto de emergencia">
            <input className="input" value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} />
          </Field>
          <Field label="Telefono de emergencia">
            <input className="input" value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Posicion">
            <input className="input" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          </Field>
          <Field label="Altura (cm)">
            <input type="number" step="0.1" className="input" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
          </Field>
          <Field label="Peso (kg)">
            <input type="number" step="0.1" className="input" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
          </Field>
        </div>
        <Field label="Estado">
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="INJURED">Lesionado</option>
            <option value="SUSPENDED">Suspendido</option>
          </select>
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="card">
      <div className="mb-4 flex justify-end">
        {canEdit && (
          <button className="btn-secondary" onClick={() => setEditing(true)}>
            Editar informacion
          </button>
        )}
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Documento" value={player.documentId} />
        <Info label="Fecha de nacimiento" value={fmtDate(player.birthDate)} />
        <Info label="Sexo" value={player.sex === "M" ? "Masculino" : "Femenino"} />
        <Info label="Telefono" value={player.phone} />
        <Info label="Direccion" value={player.address} />
        <Info label="EPS" value={player.eps} />
        <Info label="Contacto de emergencia" value={player.emergencyContactName} />
        <Info label="Telefono de emergencia" value={player.emergencyContactPhone} />
        <Info label="Categoria" value={player.category?.name} />
        <Info label="Posicion" value={player.position} />
        <Info label="Altura" value={player.heightCm ? `${player.heightCm} cm` : null} />
        <Info label="Peso" value={player.weightKg ? `${player.weightKg} kg` : null} />
        <Info label="Fecha de ingreso" value={fmtDate(player.joinDate)} />
      </dl>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-slate-700">{value || "-"}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Familia
// ---------------------------------------------------------------------------
function FamiliaTab({ profile, canEdit }: { profile: PlayerProfileData; canEdit: boolean }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessGuardian, setAccessGuardian] = useState<{ id: number; firstName: string; lastName: string; email: string | null } | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    documentId: "",
    phone: "",
    email: "",
    address: "",
    relationship: "MADRE",
    isPrimaryContact: false,
    canViewPayments: true,
    canViewEvaluations: true,
  });

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/players/${profile.player.id}/guardians`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo agregar el tutor");
        return;
      }
      setModalOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(guardianId: number) {
    if (!confirm("¿Quitar este tutor del jugador?")) return;
    await fetch(`/api/players/${profile.player.id}/guardians/${guardianId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Padres / tutores</h3>
        {canEdit && (
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Agregar tutor
          </button>
        )}
      </div>
      {profile.player.guardians.length === 0 ? (
        <p className="text-sm text-slate-400">No hay tutores registrados para este jugador.</p>
      ) : (
        <div className="space-y-3">
          {profile.player.guardians.map((pg: any) => (
            <div key={pg.guardian.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
              <div>
                <p className="font-medium text-slate-700">
                  {pg.guardian.firstName} {pg.guardian.lastName}{" "}
                  {pg.isPrimaryContact && <Badge tone="green">Contacto principal</Badge>}
                </p>
                <p className="text-sm text-slate-500">
                  {pg.relationship === "MADRE" ? "Madre" : pg.relationship === "PADRE" ? "Padre" : pg.relationship === "TUTOR" ? "Tutor" : "Otro"} -{" "}
                  {pg.guardian.phone ?? "sin telefono"} - {pg.guardian.email ?? "sin correo"}
                </p>
                {pg.guardian.user ? (
                  <p className="mt-1 text-xs text-turqui-700">Con acceso a la app: {pg.guardian.user.email}</p>
                ) : (
                  canEdit && (
                    <button
                      className="btn-secondary mt-2"
                      onClick={() =>
                        setAccessGuardian({
                          id: pg.guardian.id,
                          firstName: pg.guardian.firstName,
                          lastName: pg.guardian.lastName,
                          email: pg.guardian.email,
                        })
                      }
                    >
                      <KeyRound className="h-4 w-4" /> Crear acceso
                    </button>
                  )
                )}
              </div>
              {canEdit && (
                <button className="btn-ghost text-choles-red" onClick={() => handleRemove(pg.guardian.id)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Agregar padre / tutor">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombres">
              <input className="input" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </Field>
            <Field label="Apellidos">
              <input className="input" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefono">
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Correo">
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
          </div>
          <Field label="Parentesco">
            <select className="input" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
              <option value="MADRE">Madre</option>
              <option value="PADRE">Padre</option>
              <option value="TUTOR">Tutor</option>
              <option value="OTRO">Otro</option>
            </select>
          </Field>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isPrimaryContact} onChange={(e) => setForm({ ...form, isPrimaryContact: e.target.checked })} />
              Contacto principal
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.canViewPayments} onChange={(e) => setForm({ ...form, canViewPayments: e.target.checked })} />
              Puede ver pagos
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.canViewEvaluations} onChange={(e) => setForm({ ...form, canViewEvaluations: e.target.checked })} />
              Puede ver evaluaciones
            </label>
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </Modal>

      <CreateAccessModal
        open={!!accessGuardian}
        onClose={() => setAccessGuardian(null)}
        title={`Crear acceso para ${accessGuardian?.firstName ?? ""} ${accessGuardian?.lastName ?? ""}`}
        endpoint={accessGuardian ? `/api/guardians/${accessGuardian.id}/user` : ""}
        defaultEmail={accessGuardian?.email ?? ""}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asistencia
// ---------------------------------------------------------------------------
const ATTENDANCE_LABEL: Record<string, { label: string; tone: "green" | "yellow" | "red" | "gray" }> = {
  PRESENT: { label: "Presente", tone: "green" },
  LATE: { label: "Tarde", tone: "yellow" },
  ABSENT: { label: "Ausente", tone: "red" },
  EXCUSED: { label: "Justificado", tone: "gray" },
};

function AsistenciaTab({ profile }: { profile: PlayerProfileData }) {
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Historial de asistencia</h3>
        <p className="text-sm text-slate-500">
          % de asistencia:{" "}
          <span className="font-bold text-turqui-700">
            {profile.attendancePercentage !== null ? `${profile.attendancePercentage}%` : "-"}
          </span>
        </p>
      </div>
      <table className="table-base">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Equipo</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {profile.attendance.map((a: any) => {
            const info = ATTENDANCE_LABEL[a.status];
            return (
              <tr key={a.id}>
                <td>{fmtDate(a.trainingSession.date)}</td>
                <td>{a.trainingSession.team.name}</td>
                <td>
                  <Badge tone={info.tone}>{info.label}</Badge>
                </td>
              </tr>
            );
          })}
          {profile.attendance.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center text-slate-400">
                Sin registros de asistencia.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagos
// ---------------------------------------------------------------------------
function PagosTab({ profile }: { profile: PlayerProfileData }) {
  return (
    <div className="card">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Historial de pagos</h3>
      <table className="table-base">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Concepto</th>
            <th>Valor</th>
            <th>Metodo</th>
            <th>Estado</th>
            <th>Recibo</th>
          </tr>
        </thead>
        <tbody>
          {profile.payments.map((p: any) => {
            const eff = effectiveStatus({ status: p.status, dueDate: p.dueDate, paymentDate: p.paymentDate, amount: p.amount });
            const b = statusBadge("payment", eff);
            return (
              <tr key={p.id}>
                <td>{fmtDate(p.paymentDate ?? p.dueDate)}</td>
                <td>{p.concept.name}</td>
                <td>{fmtMoney(p.amount)}</td>
                <td>{p.method ?? "-"}</td>
                <td>
                  <Badge tone={b.tone}>{b.label}</Badge>
                </td>
                <td>
                  {p.receipt ? (
                    <a href={`/api/payments/${p.id}/receipt`} target="_blank" className="inline-flex items-center gap-1 text-turqui-700 hover:underline">
                      <Download className="h-3.5 w-3.5" /> {p.receiptNumber}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            );
          })}
          {profile.payments.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-slate-400">
                Sin pagos registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estadisticas (partidos)
// ---------------------------------------------------------------------------
function EstadisticasTab({ profile }: { profile: PlayerProfileData }) {
  const stats = profile.matchStats;
  const totals = stats.reduce(
    (acc: any, s: any) => ({
      points: acc.points + s.points,
      rebounds: acc.rebounds + s.rebounds,
      assists: acc.assists + s.assists,
      games: acc.games + 1,
    }),
    { points: 0, rebounds: 0, assists: 0, games: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat label="Partidos" value={totals.games} />
        <MiniStat label="Puntos totales" value={totals.points} />
        <MiniStat label="Promedio puntos" value={totals.games ? (totals.points / totals.games).toFixed(1) : "0"} />
        <MiniStat label="Promedio rebotes" value={totals.games ? (totals.rebounds / totals.games).toFixed(1) : "0"} />
      </div>
      <div className="card">
        <table className="table-base">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Rival</th>
              <th>Min</th>
              <th>Pts</th>
              <th>Reb</th>
              <th>Ast</th>
              <th>Rob</th>
              <th>Blq</th>
              <th>Per</th>
              <th>Faltas</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s: any) => (
              <tr key={s.id}>
                <td>{fmtDate(s.match.date)}</td>
                <td>{s.match.opponentName}</td>
                <td>{s.minutesPlayed}</td>
                <td className="font-semibold">{s.points}</td>
                <td>{s.rebounds}</td>
                <td>{s.assists}</td>
                <td>{s.steals}</td>
                <td>{s.blocks}</td>
                <td>{s.turnovers}</td>
                <td>{s.fouls}</td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-slate-400">
                  Sin estadisticas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card text-center">
      <p className="text-2xl font-bold text-turqui-700">{value}</p>
      <p className="text-xs uppercase text-slate-400">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evaluaciones fisicas
// ---------------------------------------------------------------------------
function EvaluacionesTab({ profile }: { profile: PlayerProfileData }) {
  return (
    <div className="space-y-4">
      {profile.evaluations.length === 0 && (
        <div className="card">
          <p className="text-sm text-slate-400">Sin evaluaciones registradas.</p>
        </div>
      )}
      {profile.evaluations.map((ev: any) => (
        <div key={ev.id} className="card">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700">Evaluacion del {fmtDate(ev.date)}</h4>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {ev.tests.map((t: any) => (
              <div key={t.id} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">{t.testName}</p>
                <p className="text-lg font-bold text-slate-700">
                  {t.value} <span className="text-xs font-normal text-slate-400">{t.unit}</span>
                </p>
              </div>
            ))}
          </div>
          {ev.notes && <p className="mt-3 text-sm text-slate-500">{ev.notes}</p>}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entrenamientos (proximos, del equipo actual)
// ---------------------------------------------------------------------------
function EntrenamientosTab({ profile }: { profile: PlayerProfileData }) {
  return (
    <div className="card">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Proximos entrenamientos del equipo</h3>
      {profile.upcomingTrainings.length === 0 ? (
        <p className="text-sm text-slate-400">No hay entrenamientos agendados.</p>
      ) : (
        <ul className="space-y-2">
          {profile.upcomingTrainings.map((s: any) => (
            <li key={s.id} className="rounded-lg border border-slate-100 p-3 text-sm">
              <p className="font-medium">{fmtDate(s.date)}</p>
              <p className="text-slate-500">
                {s.startTime} - {s.endTime} en {s.location ?? "por definir"}
              </p>
              {s.objective && <p className="text-slate-400">Objetivo: {s.objective}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Partidos
// ---------------------------------------------------------------------------
function PartidosTab({ profile }: { profile: PlayerProfileData }) {
  return (
    <div className="card">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Partidos jugados</h3>
      <table className="table-base">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Rival</th>
            <th>Resultado</th>
            <th>Minutos</th>
            <th>Puntos</th>
          </tr>
        </thead>
        <tbody>
          {profile.matchStats.map((s: any) => (
            <tr key={s.id}>
              <td>{fmtDate(s.match.date)}</td>
              <td>{s.match.opponentName}</td>
              <td>
                {s.match.resultTeamScore} - {s.match.resultOpponentScore}
              </td>
              <td>{s.minutesPlayed}</td>
              <td className="font-semibold">{s.points}</td>
            </tr>
          ))}
          {profile.matchStats.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-slate-400">
                Sin partidos registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------
const DOC_TYPE_LABEL: Record<string, string> = {
  ID: "Documento de identidad",
  EPS: "EPS",
  AUTHORIZATION: "Autorizacion",
  CERTIFICATE: "Certificado",
  PHOTO: "Foto",
  OTHER: "Otro",
};

function DocumentosTab({ profile, canManage }: { profile: PlayerProfileData; canManage: boolean }) {
  const router = useRouter();
  const [type, setType] = useState("ID");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch(`/api/players/${profile.player.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, fileName: file.name, mimeType: file.type || "application/octet-stream", base64Data: base64 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo subir el archivo");
        return;
      }
      router.refresh();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este documento?")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="card">
      {canManage && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3">
          <select className="input max-w-[220px]" value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(DOC_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="btn-primary cursor-pointer">
            <UploadCloud className="h-4 w-4" />
            {uploading ? "Subiendo..." : "Subir documento"}
            <input type="file" className="hidden" onChange={handleFileChange} disabled={uploading} />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
      <table className="table-base">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Archivo</th>
            <th>Fecha</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {profile.documents.map((d: any) => (
            <tr key={d.id}>
              <td>{DOC_TYPE_LABEL[d.type] ?? d.type}</td>
              <td>
                <a href={`/api/documents/${d.id}/file`} target="_blank" className="text-turqui-700 hover:underline">
                  {d.fileName}
                </a>
              </td>
              <td>{fmtDate(d.uploadedAt)}</td>
              <td>
                {canManage && (
                  <button className="btn-ghost text-choles-red" onClick={() => handleDelete(d.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {profile.documents.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-slate-400">
                Sin documentos cargados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Observaciones
// ---------------------------------------------------------------------------
function ObservacionesTab({ profile, canEdit }: { profile: PlayerProfileData; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(profile.player.observations ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/players/${profile.player.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: profile.player.firstName,
          lastName: profile.player.lastName,
          birthDate: profile.player.birthDate,
          sex: profile.player.sex,
          status: profile.player.status,
          categoryId: profile.player.categoryId,
          observations: value,
        }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      {editing ? (
        <div className="space-y-3">
          <textarea className="input" rows={8} value={value} onChange={(e) => setValue(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button className="btn-secondary" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{profile.player.observations || "Sin observaciones registradas."}</p>
          {canEdit && (
            <button className="btn-secondary mt-4" onClick={() => setEditing(true)}>
              Editar observaciones
            </button>
          )}
        </div>
      )}
    </div>
  );
}
