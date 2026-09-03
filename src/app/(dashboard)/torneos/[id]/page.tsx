"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wand2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Badge, statusBadge } from "@/components/Badge";
import { formatDateCO } from "@/lib/date-format";

interface Participant {
  kind: "team" | "external";
  teamId?: number;
  externalTeamName?: string;
  label: string;
}

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<any>(null);
  const [standingsByGroup, setStandingsByGroup] = useState<any[]>([]);
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);
  const [externalNames, setExternalNames] = useState("");
  const [groupCount, setGroupCount] = useState(1);
  const [doubleRound, setDoubleRound] = useState(false);
  const [firstMatchDate, setFirstMatchDate] = useState("");
  const [daysBetweenRounds, setDaysBetweenRounds] = useState(7);

  async function load() {
    setLoading(true);
    const [tRes, teamsRes] = await Promise.all([fetch(`/api/tournaments/${params.id}`), fetch("/api/teams")]);
    const tData = await tRes.json();
    setTournament(tData.tournament);
    setStandingsByGroup(tData.standingsByGroup ?? []);
    setTeams((await teamsRes.json()).teams ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  function toggleTeam(id: number) {
    setSelectedTeamIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function handleGenerate() {
    setSaving(true);
    setError(null);
    try {
      const participants: Participant[] = [
        ...selectedTeamIds.map((id) => ({ kind: "team" as const, teamId: id, label: "" })),
        ...externalNames
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name) => ({ kind: "external" as const, externalTeamName: name, label: name })),
      ];
      if (participants.length < 2) {
        setError("Selecciona al menos 2 equipos (propios o externos)");
        return;
      }
      const res = await fetch(`/api/tournaments/${params.id}/generate-fixture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participants: participants.map((p) => (p.kind === "team" ? { teamId: p.teamId } : { externalTeamName: p.externalTeamName })),
          groupCount,
          doubleRound,
          firstMatchDate,
          daysBetweenRounds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo generar el fixture");
        return;
      }
      setModalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading || !tournament) return <p className="text-sm text-slate-400">Cargando...</p>;

  return (
    <div className="space-y-6">
      <Link href="/torneos" className="inline-flex items-center gap-1 text-sm text-turqui-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a torneos
      </Link>

      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{tournament.name}</h1>
          <p className="text-sm text-slate-500">
            {formatDateCO(tournament.startDate)} - {formatDateCO(tournament.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(() => {
            const b = statusBadge("tournament", tournament.status);
            return <Badge tone={b.tone}>{b.label}</Badge>;
          })()}
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Wand2 className="h-4 w-4" /> {tournament.matches.length > 0 ? "Regenerar fixture" : "Generar fixture"}
          </button>
        </div>
      </div>

      {standingsByGroup.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {standingsByGroup.map(({ group, standings }: any) => (
            <div key={group.id} className="card">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Tabla de posiciones - {group.name}</h3>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Equipo</th>
                    <th>PJ</th>
                    <th>G</th>
                    <th>P</th>
                    <th>Dif</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s: any, i: number) => (
                    <tr key={s.teamKey}>
                      <td>{i + 1}</td>
                      <td className="font-medium">{s.teamName}</td>
                      <td>{s.played}</td>
                      <td>{s.wins}</td>
                      <td>{s.losses}</td>
                      <td>{s.pointsDiff > 0 ? `+${s.pointsDiff}` : s.pointsDiff}</td>
                    </tr>
                  ))}
                  {standings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400">
                        Aun no hay partidos finalizados en este grupo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Partidos del torneo</h3>
        <table className="table-base">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Equipo</th>
              <th>Rival</th>
              <th>Resultado</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tournament.matches.map((m: any) => {
              const b = statusBadge("match", m.status);
              return (
                <tr key={m.id}>
                  <td>{formatDateCO(m.date)}</td>
                  <td>{m.team.name}</td>
                  <td>{m.opponentName}</td>
                  <td>{m.resultTeamScore !== null ? `${m.resultTeamScore} - ${m.resultOpponentScore}` : "-"}</td>
                  <td>
                    <Badge tone={b.tone}>{b.label}</Badge>
                  </td>
                  <td>
                    <Link href={`/partidos/${m.id}`} className="text-turqui-700 hover:underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              );
            })}
            {tournament.matches.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  Aun no se ha generado el fixture de este torneo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Generar fixture" widthClass="max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="label">Equipos del club participantes</label>
            <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
              {teams.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selectedTeamIds.includes(t.id)} onChange={() => toggleTeam(t.id)} />
                  {t.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Equipos externos (uno por linea)</label>
            <textarea className="input" rows={3} value={externalNames} onChange={(e) => setExternalNames(e.target.value)} placeholder={"Halcones BBC\nTitanes del Norte"} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Numero de grupos</label>
              <input type="number" min={1} max={8} className="input" value={groupCount} onChange={(e) => setGroupCount(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Fecha primer partido</label>
              <input type="date" required className="input" value={firstMatchDate} onChange={(e) => setFirstMatchDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Dias entre rondas</label>
              <input type="number" min={1} className="input" value={daysBetweenRounds} onChange={(e) => setDaysBetweenRounds(Number(e.target.value))} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={doubleRound} onChange={(e) => setDoubleRound(e.target.checked)} />
            Ida y vuelta
          </label>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <p className="text-xs text-slate-400">
            Generar de nuevo reemplaza por completo los grupos y partidos actuales de este torneo.
          </p>
          <button className="btn-primary w-full" onClick={handleGenerate} disabled={saving}>
            {saving ? "Generando..." : "Generar fixture"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
