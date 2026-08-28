"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface StatRow {
  player: { id: number; firstName: string; lastName: string };
  jerseyNumber: number | null;
  stats: Record<string, number> | null;
}

const STAT_FIELDS: Array<{ key: string; label: string; width?: string }> = [
  { key: "minutesPlayed", label: "Min" },
  { key: "points", label: "Pts" },
  { key: "rebounds", label: "Reb" },
  { key: "assists", label: "Ast" },
  { key: "steals", label: "Rob" },
  { key: "blocks", label: "Blq" },
  { key: "turnovers", label: "Per" },
  { key: "fouls", label: "Fal" },
  { key: "fieldGoalsMade", label: "TC-A" },
  { key: "fieldGoalsAtt", label: "TC-I" },
  { key: "threePointsMade", label: "3P-A" },
  { key: "threePointsAtt", label: "3P-I" },
  { key: "freeThrowsMade", label: "TL-A" },
  { key: "freeThrowsAtt", label: "TL-I" },
];

export default function MatchStatsPage() {
  const params = useParams<{ id: string }>();
  const [match, setMatch] = useState<any>(null);
  const [roster, setRoster] = useState<StatRow[]>([]);
  const [values, setValues] = useState<Record<number, Record<string, number>>>({});
  const [teamScore, setTeamScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/matches/${params.id}`);
    const data = await res.json();
    setMatch(data.match);
    setRoster(data.roster ?? []);
    setTeamScore(data.match.resultTeamScore ?? 0);
    setOppScore(data.match.resultOpponentScore ?? 0);
    const initial: Record<number, Record<string, number>> = {};
    for (const r of data.roster ?? []) {
      initial[r.player.id] = {
        minutesPlayed: r.stats?.minutesPlayed ?? 0,
        points: r.stats?.points ?? 0,
        rebounds: r.stats?.rebounds ?? 0,
        assists: r.stats?.assists ?? 0,
        steals: r.stats?.steals ?? 0,
        blocks: r.stats?.blocks ?? 0,
        turnovers: r.stats?.turnovers ?? 0,
        fouls: r.stats?.fouls ?? 0,
        fieldGoalsMade: r.stats?.fieldGoalsMade ?? 0,
        fieldGoalsAtt: r.stats?.fieldGoalsAtt ?? 0,
        threePointsMade: r.stats?.threePointsMade ?? 0,
        threePointsAtt: r.stats?.threePointsAtt ?? 0,
        freeThrowsMade: r.stats?.freeThrowsMade ?? 0,
        freeThrowsAtt: r.stats?.freeThrowsAtt ?? 0,
      };
    }
    setValues(initial);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  function setStat(playerId: number, key: string, value: number) {
    setValues((v) => ({ ...v, [playerId]: { ...v[playerId], [key]: value } }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const stats = roster.map((r) => ({ playerId: r.player.id, ...values[r.player.id] }));
      const res = await fetch(`/api/matches/${params.id}/statistics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats, resultTeamScore: teamScore, resultOpponentScore: oppScore }),
      });
      if (res.ok) {
        setSaved(true);
      } else {
        const data = await res.json();
        alert(data.error ?? "No se pudo guardar");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Cargando...</p>;

  return (
    <div className="space-y-4 pb-20">
      <Link href="/partidos" className="inline-flex items-center gap-1 text-sm text-turqui-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a partidos
      </Link>

      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800">
            {match.team.name} vs {match.opponentName}
          </h1>
          <p className="text-sm text-slate-500">
            {new Date(match.date).toLocaleDateString("es-CO")} - {match.time}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input type="number" className="input w-20 text-center" value={teamScore} onChange={(e) => setTeamScore(Number(e.target.value))} />
          <span className="text-slate-400">-</span>
          <input type="number" className="input w-20 text-center" value={oppScore} onChange={(e) => setOppScore(Number(e.target.value))} />
        </div>
      </div>

      <div className="card">
        <div className="thin-scrollbar overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Jugador</th>
                {STAT_FIELDS.map((f) => (
                  <th key={f.key} className="text-center">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.player.id}>
                  <td className="whitespace-nowrap font-medium">
                    {r.player.firstName} {r.player.lastName}
                  </td>
                  {STAT_FIELDS.map((f) => (
                    <td key={f.key}>
                      <input
                        type="number"
                        min={0}
                        className="input w-14 px-1 py-1 text-center"
                        value={values[r.player.id]?.[f.key] ?? 0}
                        onChange={(e) => setStat(r.player.id, f.key, Number(e.target.value))}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {roster.length === 0 && (
                <tr>
                  <td colSpan={STAT_FIELDS.length + 1} className="py-6 text-center text-slate-400">
                    Este equipo no tiene jugadores asignados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-3 md:pl-64">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          {saved && <span className="text-sm text-green-600">Estadisticas guardadas</span>}
          <button className="btn-primary ml-auto" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar estadisticas y finalizar partido"}
          </button>
        </div>
      </div>
    </div>
  );
}
