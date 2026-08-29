import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getTeamDetail } from "@/server/services/team.service";
import { attendancePercentage } from "@/server/logic/attendance";
import { TeamRoster } from "@/components/team/TeamRoster";

export default async function TeamDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.clubId) redirect("/dashboard");

  const { team, roster, upcomingMatches, pastMatches, upcomingTrainings, recentAttendance } = await getTeamDetail(
    user.clubId,
    Number(params.id)
  );

  const teamAttendancePct = attendancePercentage(recentAttendance.map((a) => a.status));

  return (
    <div className="space-y-6">
      <Link href="/equipos" className="inline-flex items-center gap-1 text-sm text-turqui-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a equipos
      </Link>

      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{team.name}</h1>
          <p className="text-sm text-slate-500">
            {team.category.name} - {team.branch === "MASCULINO" ? "Masculino" : team.branch === "FEMENINO" ? "Femenino" : "Mixto"}
            {team.season ? ` - ${team.season.name}` : ""}
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-slate-400">Entrenador</p>
            <p className="font-medium">{team.coach ? `${team.coach.firstName} ${team.coach.lastName}` : "Sin asignar"}</p>
          </div>
          <div>
            <p className="text-slate-400">Delegado</p>
            <p className="font-medium">{team.delegate ? `${team.delegate.firstName} ${team.delegate.lastName}` : "Sin asignar"}</p>
          </div>
          <div>
            <p className="text-slate-400">Asistencia (30d)</p>
            <p className="font-medium">{teamAttendancePct !== null ? `${teamAttendancePct}%` : "-"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TeamRoster teamId={team.id} initialRoster={roster} />

        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Proximos partidos</h2>
            {upcomingMatches.length === 0 && <p className="text-sm text-slate-400">Sin partidos agendados.</p>}
            <ul className="space-y-2">
              {upcomingMatches.map((m) => (
                <li key={m.id} className="rounded-lg border border-slate-100 p-2 text-sm">
                  <p className="font-medium">vs {m.opponentName}</p>
                  <p className="text-slate-400">{new Date(m.date).toLocaleDateString("es-CO")} - {m.time}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Proximos entrenamientos</h2>
            {upcomingTrainings.length === 0 && <p className="text-sm text-slate-400">Sin entrenamientos agendados.</p>}
            <ul className="space-y-2">
              {upcomingTrainings.map((s) => (
                <li key={s.id} className="rounded-lg border border-slate-100 p-2 text-sm">
                  <p className="font-medium">{new Date(s.date).toLocaleDateString("es-CO")}</p>
                  <p className="text-slate-400">{s.startTime} - {s.endTime} en {s.location ?? "por definir"}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Resultados recientes</h2>
        <div className="thin-scrollbar overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Rival</th>
                <th>Resultado</th>
                <th>Local/Visitante</th>
              </tr>
            </thead>
            <tbody>
              {pastMatches.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.date).toLocaleDateString("es-CO")}</td>
                  <td>{m.opponentName}</td>
                  <td className="font-medium">
                    {m.resultTeamScore} - {m.resultOpponentScore}
                  </td>
                  <td>{m.isHome ? "Local" : "Visitante"}</td>
                </tr>
              ))}
              {pastMatches.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    Sin resultados registrados aun.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
