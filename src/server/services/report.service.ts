import "server-only";
import { prisma } from "@/lib/prisma";
import { attendancePercentage, type AttendanceStatus as AttStatus } from "@/server/logic/attendance";
import { effectiveStatus } from "@/server/logic/cartera";
import { formatDateCO } from "@/lib/date-format";

export interface ReportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ReportResult {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
}

export type ReportType =
  | "players"
  | "players-by-category"
  | "attendance"
  | "revenue"
  | "payments"
  | "statistics"
  | "evaluations"
  | "matches"
  | "tournaments";

export interface ReportFilters {
  from?: string;
  to?: string;
  categoryId?: number;
  teamId?: number;
}

const STATUS_LABEL: Record<string, string> = { ACTIVE: "Activo", INACTIVE: "Inactivo", INJURED: "Lesionado", SUSPENDED: "Suspendido" };

export async function getReportData(clubId: number, type: ReportType, filters: ReportFilters): Promise<ReportResult> {
  switch (type) {
    case "players":
      return playersReport(clubId, filters);
    case "players-by-category":
      return playersByCategoryReport(clubId);
    case "attendance":
      return attendanceReport(clubId, filters);
    case "revenue":
      return revenueReport(clubId, filters);
    case "payments":
      return paymentsReport(clubId, filters);
    case "statistics":
      return statisticsReport(clubId, filters);
    case "evaluations":
      return evaluationsReport(clubId, filters);
    case "matches":
      return matchesReport(clubId, filters);
    case "tournaments":
      return tournamentsReport(clubId);
    default:
      throw new Error(`Tipo de reporte desconocido: ${type}`);
  }
}

async function playersReport(clubId: number, filters: ReportFilters): Promise<ReportResult> {
  const where: any = { clubId };
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.teamId) where.teamPlayers = { some: { teamId: filters.teamId, leftAt: null } };

  const players = await prisma.player.findMany({
    where,
    include: {
      category: { select: { name: true } },
      teamPlayers: { where: { leftAt: null }, take: 1, include: { team: { select: { name: true } } } },
    },
    orderBy: [{ firstName: "asc" }],
  });

  return {
    title: "Jugadores",
    columns: [
      { header: "Nombre", key: "name", width: 160 },
      { header: "Documento", key: "documentId", width: 90 },
      { header: "Categoria", key: "category", width: 90 },
      { header: "Equipo", key: "team", width: 110 },
      { header: "Edad", key: "age", width: 40 },
      { header: "Estado", key: "status", width: 80 },
    ],
    rows: players.map((p) => ({
      name: `${p.firstName} ${p.lastName}`,
      documentId: p.documentId ?? "-",
      category: p.category?.name ?? "-",
      team: p.teamPlayers[0]?.team.name ?? "-",
      age: Math.floor((Date.now() - p.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
      status: STATUS_LABEL[p.status] ?? p.status,
    })),
  };
}

async function playersByCategoryReport(clubId: number): Promise<ReportResult> {
  const categories = await prisma.category.findMany({
    where: { clubId },
    select: { name: true, _count: { select: { players: { where: { status: "ACTIVE" } } } } },
    orderBy: { name: "asc" },
  });
  return {
    title: "Jugadores activos por categoria",
    columns: [
      { header: "Categoria", key: "category", width: 200 },
      { header: "Jugadores activos", key: "count", width: 100 },
    ],
    rows: categories.map((c) => ({ category: c.name, count: c._count.players })),
  };
}

async function attendanceReport(clubId: number, filters: ReportFilters): Promise<ReportResult> {
  const where: any = { trainingSession: { clubId } };
  if (filters.from || filters.to) {
    where.trainingSession.date = {};
    if (filters.from) where.trainingSession.date.gte = new Date(filters.from);
    if (filters.to) where.trainingSession.date.lte = new Date(filters.to);
  }
  if (filters.teamId) where.trainingSession.teamId = filters.teamId;

  const rows = await prisma.attendance.findMany({
    where,
    select: {
      status: true,
      playerId: true,
      player: { select: { firstName: true, lastName: true, category: { select: { name: true } } } },
    },
  });

  const byPlayer = new Map<number, { name: string; category: string; statuses: AttStatus[] }>();
  for (const r of rows) {
    const entry = byPlayer.get(r.playerId) ?? {
      name: `${r.player.firstName} ${r.player.lastName}`,
      category: r.player.category?.name ?? "-",
      statuses: [],
    };
    entry.statuses.push(r.status as AttStatus);
    byPlayer.set(r.playerId, entry);
  }

  return {
    title: "Asistencia por jugador",
    columns: [
      { header: "Jugador", key: "name", width: 160 },
      { header: "Categoria", key: "category", width: 100 },
      { header: "% Asistencia", key: "percentage", width: 80 },
      { header: "Sesiones", key: "total", width: 60 },
    ],
    rows: Array.from(byPlayer.values())
      .map((v) => ({
        name: v.name,
        category: v.category,
        percentage: attendancePercentage(v.statuses) ?? 0,
        total: v.statuses.length,
      }))
      .sort((a, b) => a.percentage - b.percentage),
  };
}

function fmtMoney(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

async function revenueReport(clubId: number, filters: ReportFilters): Promise<ReportResult> {
  const where: any = { clubId, status: "PAID" };
  if (filters.from || filters.to) {
    where.paymentDate = {};
    if (filters.from) where.paymentDate.gte = new Date(filters.from);
    if (filters.to) where.paymentDate.lte = new Date(filters.to);
  }
  const payments = await prisma.payment.findMany({ where, select: { amount: true, paymentDate: true } });

  const byMonth = new Map<string, number>();
  for (const p of payments) {
    if (!p.paymentDate) continue;
    const key = `${p.paymentDate.getFullYear()}-${String(p.paymentDate.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + p.amount);
  }

  return {
    title: "Ingresos mensuales",
    columns: [
      { header: "Mes", key: "month", width: 100 },
      { header: "Total recaudado", key: "totalFmt", width: 140 },
    ],
    rows: Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total, totalFmt: fmtMoney(total) })),
  };
}

async function paymentsReport(clubId: number, filters: ReportFilters): Promise<ReportResult> {
  const where: any = { clubId };
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = new Date(filters.from);
    if (filters.to) where.createdAt.lte = new Date(filters.to);
  }
  const payments = await prisma.payment.findMany({
    where,
    include: { player: { select: { firstName: true, lastName: true } }, concept: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return {
    title: "Pagos",
    columns: [
      { header: "Jugador", key: "player", width: 150 },
      { header: "Concepto", key: "concept", width: 110 },
      { header: "Valor", key: "amountFmt", width: 100 },
      { header: "Metodo", key: "method", width: 90 },
      { header: "Estado", key: "statusLabel", width: 80 },
      { header: "Recibo", key: "receiptNumber", width: 90 },
    ],
    rows: payments.map((p) => {
      const eff = effectiveStatus({
        status: p.status,
        dueDate: p.dueDate?.toISOString() ?? null,
        paymentDate: p.paymentDate?.toISOString() ?? null,
        amount: p.amount,
      });
      return {
        player: `${p.player.firstName} ${p.player.lastName}`,
        concept: p.concept.name,
        amountFmt: fmtMoney(p.amount),
        method: p.method ?? "-",
        statusLabel: eff === "PAID" ? "Pagado" : eff === "OVERDUE" ? "Vencido" : "Pendiente",
        receiptNumber: p.receiptNumber,
      };
    }),
  };
}

async function statisticsReport(clubId: number, filters: ReportFilters): Promise<ReportResult> {
  const where: any = { match: { clubId } };
  if (filters.teamId) where.match.teamId = filters.teamId;

  const stats = await prisma.matchStatistic.findMany({
    where,
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
  });

  const byPlayer = new Map<
    number,
    { name: string; games: number; points: number; rebounds: number; assists: number; steals: number; blocks: number }
  >();
  for (const s of stats) {
    const entry = byPlayer.get(s.playerId) ?? {
      name: `${s.player.firstName} ${s.player.lastName}`,
      games: 0,
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
    };
    entry.games += 1;
    entry.points += s.points;
    entry.rebounds += s.rebounds;
    entry.assists += s.assists;
    entry.steals += s.steals;
    entry.blocks += s.blocks;
    byPlayer.set(s.playerId, entry);
  }

  return {
    title: "Estadisticas deportivas (acumulado)",
    columns: [
      { header: "Jugador", key: "name", width: 160 },
      { header: "PJ", key: "games", width: 40 },
      { header: "Puntos", key: "points", width: 60 },
      { header: "Prom. Pts", key: "avgPoints", width: 60 },
      { header: "Rebotes", key: "rebounds", width: 60 },
      { header: "Asistencias", key: "assists", width: 70 },
      { header: "Robos", key: "steals", width: 50 },
      { header: "Bloqueos", key: "blocks", width: 60 },
    ],
    rows: Array.from(byPlayer.values())
      .map((v) => ({ ...v, avgPoints: v.games > 0 ? Math.round((v.points / v.games) * 10) / 10 : 0 }))
      .sort((a, b) => b.points - a.points),
  };
}

async function evaluationsReport(clubId: number, filters: ReportFilters): Promise<ReportResult> {
  const where: any = { clubId };
  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = new Date(filters.from);
    if (filters.to) where.date.lte = new Date(filters.to);
  }
  const evaluations = await prisma.evaluation.findMany({
    where,
    include: { player: { select: { firstName: true, lastName: true } }, tests: true },
    orderBy: { date: "desc" },
  });

  const rows: Record<string, unknown>[] = [];
  for (const ev of evaluations) {
    for (const t of ev.tests) {
      rows.push({
        player: `${ev.player.firstName} ${ev.player.lastName}`,
        date: formatDateCO(ev.date),
        test: t.testName,
        value: t.value,
        unit: t.unit,
      });
    }
  }

  return {
    title: "Evaluaciones deportivas",
    columns: [
      { header: "Jugador", key: "player", width: 150 },
      { header: "Fecha", key: "date", width: 80 },
      { header: "Prueba", key: "test", width: 110 },
      { header: "Valor", key: "value", width: 60 },
      { header: "Unidad", key: "unit", width: 60 },
    ],
    rows,
  };
}

async function matchesReport(clubId: number, filters: ReportFilters): Promise<ReportResult> {
  const where: any = { clubId };
  if (filters.teamId) where.teamId = filters.teamId;
  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = new Date(filters.from);
    if (filters.to) where.date.lte = new Date(filters.to);
  }
  const matches = await prisma.match.findMany({
    where,
    include: { team: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  return {
    title: "Partidos",
    columns: [
      { header: "Fecha", key: "date", width: 80 },
      { header: "Equipo", key: "team", width: 120 },
      { header: "Rival", key: "opponent", width: 120 },
      { header: "L/V", key: "homeAway", width: 40 },
      { header: "Resultado", key: "result", width: 80 },
      { header: "Estado", key: "statusLabel", width: 80 },
    ],
    rows: matches.map((m) => ({
      date: formatDateCO(m.date),
      team: m.team.name,
      opponent: m.opponentName,
      homeAway: m.isHome ? "Local" : "Visitante",
      result:
        m.resultTeamScore !== null && m.resultOpponentScore !== null ? `${m.resultTeamScore} - ${m.resultOpponentScore}` : "-",
      statusLabel:
        m.status === "FINISHED" ? "Finalizado" : m.status === "IN_PROGRESS" ? "En juego" : m.status === "CANCELLED" ? "Cancelado" : "Programado",
    })),
  };
}

async function tournamentsReport(clubId: number): Promise<ReportResult> {
  const tournaments = await prisma.tournament.findMany({
    where: { clubId },
    include: { category: { select: { name: true } }, teams: true, _count: { select: { matches: true } } },
    orderBy: { startDate: "desc" },
  });

  return {
    title: "Torneos",
    columns: [
      { header: "Nombre", key: "name", width: 180 },
      { header: "Categoria", key: "category", width: 100 },
      { header: "Equipos", key: "teamsCount", width: 60 },
      { header: "Partidos", key: "matchesCount", width: 60 },
      { header: "Estado", key: "statusLabel", width: 80 },
      { header: "Inicio", key: "startDate", width: 80 },
    ],
    rows: tournaments.map((t) => ({
      name: t.name,
      category: t.category?.name ?? "-",
      teamsCount: t.teams.length,
      matchesCount: t._count.matches,
      statusLabel: t.status === "FINISHED" ? "Finalizado" : t.status === "IN_PROGRESS" ? "En curso" : "Planeado",
      startDate: formatDateCO(t.startDate),
    })),
  };
}
