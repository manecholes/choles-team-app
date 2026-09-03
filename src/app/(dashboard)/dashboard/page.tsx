import { redirect } from "next/navigation";
import { Users, Shirt, UserCog, Wallet, AlertTriangle, CalendarClock, Trophy, TrendingUp } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardSummary } from "@/server/services/dashboard.service";
import { StatCard } from "@/components/StatCard";
import {
  RevenueChart,
  DelinquencyChart,
  AttendanceChart,
  PlayersByCategoryChart,
} from "@/components/charts/DashboardCharts";
import { formatDateCO } from "@/lib/date-format";

function formatCOP(value: number) {
  return value.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function formatDateTime(d: Date) {
  return new Date(d).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "GUARDIAN" || user.role === "PLAYER") redirect("/mi-hijo");
  if (!user.clubId) {
    return (
      <div className="card">
        <p className="text-slate-600">
          Tu usuario no tiene un club asignado. Como super administrador, gestiona clubes desde{" "}
          <span className="font-medium">Configuracion</span>.
        </p>
      </div>
    );
  }

  const summary = await getDashboardSummary(user.clubId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">Resumen general del club, actualizado en tiempo real.</p>
      </div>

      {/* Tarjetas (punto 4) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jugadores activos" value={summary.activePlayers} icon={Users} />
        <StatCard label="Equipos activos" value={summary.activeTeams} icon={Shirt} />
        <StatCard label="Entrenadores" value={summary.totalCoaches} icon={UserCog} />
        <StatCard
          label="Pagos del mes"
          value={formatCOP(summary.paymentsThisMonthTotal)}
          icon={Wallet}
          tone="green"
        />
        <StatCard
          label="Pagos pendientes"
          value={formatCOP(summary.pendingPaymentsTotal)}
          icon={Wallet}
          tone="yellow"
          hint={`${summary.pendingPaymentsCount} pago(s)`}
        />
        <StatCard
          label="Pagos vencidos"
          value={formatCOP(summary.overduePaymentsTotal)}
          icon={AlertTriangle}
          tone="red"
          hint={`${summary.overduePaymentsCount} pago(s)`}
        />
        <StatCard
          label="Asistencia promedio (30d)"
          value={summary.avgAttendancePercentage !== null ? `${summary.avgAttendancePercentage}%` : "-"}
          icon={TrendingUp}
        />
        <StatCard
          label="Proximo partido"
          value={summary.nextMatch ? `${summary.nextMatch.teamName} vs ${summary.nextMatch.opponentName}` : "Sin agendar"}
          icon={Trophy}
          hint={summary.nextMatch ? formatDateTime(summary.nextMatch.date) : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Proximo entrenamiento"
          value={summary.nextTraining ? summary.nextTraining.teamName : "Sin agendar"}
          icon={CalendarClock}
          hint={summary.nextTraining ? formatDateTime(summary.nextTraining.date) : undefined}
        />
        <StatCard
          label="Proximo torneo"
          value={summary.nextTournament ? summary.nextTournament.name : "Sin agendar"}
          icon={Trophy}
          hint={summary.nextTournament ? formatDateTime(summary.nextTournament.startDate) : undefined}
        />
      </div>

      {/* Graficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Ingresos mensuales</h3>
          <RevenueChart data={summary.charts.monthlyRevenue} />
        </div>
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Morosidad por categoria</h3>
          <DelinquencyChart data={summary.charts.delinquencyByCategory} />
        </div>
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Asistencia (ultimas semanas)</h3>
          <AttendanceChart data={summary.charts.attendanceByWeek} />
        </div>
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Jugadores activos por categoria</h3>
          <PlayersByCategoryChart data={summary.charts.playersByCategory} />
        </div>
      </div>

      {/* Alertas (punto 4) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AlertCard
          title="🔴 Pagos vencidos"
          items={summary.alerts.overduePlayers.map((p) => ({
            id: p.playerId,
            primary: p.playerName,
            secondary: formatCOP(p.debt),
          }))}
          emptyText="Sin pagos vencidos"
        />
        <AlertCard
          title="🟡 Pagos proximos a vencer"
          items={summary.alerts.upcomingDuePlayers.map((p) => ({
            id: p.playerId,
            primary: p.playerName,
            secondary: `${formatCOP(p.debt)} - vence ${formatDateCO(p.dueDate)}`,
          }))}
          emptyText="Sin pagos por vencer en el corto plazo"
        />
        <AlertCard
          title="🔴 Jugadores con baja asistencia"
          items={summary.alerts.lowAttendancePlayers.map((p) => ({
            id: p.playerId,
            primary: p.playerName,
            secondary: `${p.percentage}% de asistencia (30 dias)`,
          }))}
          emptyText="Todos los jugadores tienen buena asistencia"
        />
        <AlertCard
          title="🟡 Jugadores con carga elevada"
          items={summary.alerts.highLoadPlayers.map((p) => ({
            id: p.playerId,
            primary: p.playerName,
            secondary: p.ratio ? `Indice de carga (ACWR): ${p.ratio}` : "Carga elevada reciente",
          }))}
          emptyText="Sin alertas de carga por ahora"
        />
      </div>
    </div>
  );
}

function AlertCard({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Array<{ id: number; primary: string; secondary: string }>;
  emptyText: string;
}) {
  return (
    <div className="card">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium text-slate-700">{item.primary}</span>
              <span className="text-slate-500">{item.secondary}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
