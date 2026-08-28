import "server-only";
import { prisma } from "@/lib/prisma";
import { attendancePercentage, isLowAttendance, type AttendanceStatus as AttStatus } from "@/server/logic/attendance";
import { computeAcwr, classifyLoadStatus } from "@/server/logic/load";
import { effectiveStatus } from "@/server/logic/cartera";

export interface DashboardSummary {
  activePlayers: number;
  activeTeams: number;
  totalCoaches: number;
  paymentsThisMonthTotal: number;
  pendingPaymentsCount: number;
  pendingPaymentsTotal: number;
  overduePaymentsCount: number;
  overduePaymentsTotal: number;
  avgAttendancePercentage: number | null;
  nextMatch: { id: number; opponentName: string; date: Date; teamName: string } | null;
  nextTraining: { id: number; date: Date; teamName: string } | null;
  nextTournament: { id: number; name: string; startDate: Date } | null;
  alerts: {
    overduePlayers: Array<{ playerId: number; playerName: string; debt: number }>;
    upcomingDuePlayers: Array<{ playerId: number; playerName: string; debt: number; dueDate: Date }>;
    lowAttendancePlayers: Array<{ playerId: number; playerName: string; percentage: number }>;
    highLoadPlayers: Array<{ playerId: number; playerName: string; ratio: number | null }>;
  };
  charts: {
    monthlyRevenue: Array<{ month: string; total: number }>;
    delinquencyByCategory: Array<{ category: string; debt: number }>;
    attendanceByWeek: Array<{ week: string; percentage: number }>;
    playersByCategory: Array<{ category: string; count: number }>;
  };
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function weekKey(d: Date) {
  // Semana ISO aproximada: numero de dias desde epoch / 7 -> etiqueta legible con la fecha del lunes de esa semana
  const copy = new Date(d);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  return copy.toISOString().slice(0, 10);
}

export async function getDashboardSummary(clubId: number): Promise<DashboardSummary> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sixWeeksAgo = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000);
  const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);

  const [activePlayers, activeTeams, totalCoaches, categories] = await Promise.all([
    prisma.player.count({ where: { clubId, status: "ACTIVE" } }),
    prisma.team.count({ where: { clubId, status: "ACTIVE" } }),
    prisma.coach.count({ where: { clubId, active: true } }),
    prisma.category.findMany({
      where: { clubId },
      select: {
        name: true,
        _count: { select: { players: { where: { status: "ACTIVE" } } } },
      },
    }),
  ]);

  // --- Pagos: mes en curso + cartera (calculada con effectiveStatus, no solo el campo status) ---
  const paidThisMonth = await prisma.payment.aggregate({
    where: { clubId, status: "PAID", paymentDate: { gte: startOfMonth } },
    _sum: { amount: true },
  });

  const outstandingPayments = await prisma.payment.findMany({
    where: { clubId, status: { in: ["PENDING", "OVERDUE"] } },
    select: {
      id: true,
      amount: true,
      dueDate: true,
      status: true,
      paymentDate: true,
      player: { select: { id: true, firstName: true, lastName: true, category: { select: { name: true } } } },
    },
  });

  let pendingPaymentsCount = 0;
  let pendingPaymentsTotal = 0;
  let overduePaymentsCount = 0;
  let overduePaymentsTotal = 0;
  const overdueByPlayer = new Map<number, { playerName: string; debt: number }>();
  const upcomingByPlayer = new Map<number, { playerName: string; debt: number; dueDate: Date }>();
  const debtByCategory = new Map<string, number>();

  for (const p of outstandingPayments) {
    const eff = effectiveStatus(
      { status: p.status, dueDate: p.dueDate ? p.dueDate.toISOString() : null, paymentDate: null, amount: p.amount },
      now
    );
    const playerName = `${p.player.firstName} ${p.player.lastName}`;
    const categoryName = p.player.category?.name ?? "Sin categoria";
    debtByCategory.set(categoryName, (debtByCategory.get(categoryName) ?? 0) + p.amount);

    if (eff === "OVERDUE") {
      overduePaymentsCount++;
      overduePaymentsTotal += p.amount;
      const acc = overdueByPlayer.get(p.player.id) ?? { playerName, debt: 0 };
      acc.debt += p.amount;
      overdueByPlayer.set(p.player.id, acc);
    } else {
      pendingPaymentsCount++;
      pendingPaymentsTotal += p.amount;
      if (p.dueDate) {
        const acc = upcomingByPlayer.get(p.player.id) ?? { playerName, debt: 0, dueDate: p.dueDate };
        acc.debt += p.amount;
        upcomingByPlayer.set(p.player.id, acc);
      }
    }
  }

  // --- Asistencia: ultimos 30 dias ---
  const recentAttendance = await prisma.attendance.findMany({
    where: { trainingSession: { clubId, date: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } } },
    select: { status: true, playerId: true, player: { select: { firstName: true, lastName: true } } },
  });
  const overallPct = attendancePercentage(recentAttendance.map((a) => a.status as AttStatus));

  const attendanceByPlayer = new Map<number, { name: string; statuses: AttStatus[] }>();
  for (const a of recentAttendance) {
    const entry = attendanceByPlayer.get(a.playerId) ?? {
      name: `${a.player.firstName} ${a.player.lastName}`,
      statuses: [],
    };
    entry.statuses.push(a.status as AttStatus);
    attendanceByPlayer.set(a.playerId, entry);
  }
  const lowAttendancePlayers = Array.from(attendanceByPlayer.entries())
    .map(([playerId, v]) => ({ playerId, playerName: v.name, percentage: attendancePercentage(v.statuses) ?? 0 }))
    .filter((p) => isLowAttendance(p.percentage))
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 8);

  // --- Carga (RPE x duracion) para alertas de riesgo ---
  const recentLoads = await prisma.loadEntry.findMany({
    where: { clubId, date: { gte: thirtyFiveDaysAgo } },
    select: { playerId: true, date: true, internalLoad: true, player: { select: { firstName: true, lastName: true } } },
  });
  const loadsByPlayer = new Map<number, { name: string; points: { date: string; load: number }[] }>();
  for (const l of recentLoads) {
    const entry = loadsByPlayer.get(l.playerId) ?? { name: `${l.player.firstName} ${l.player.lastName}`, points: [] };
    entry.points.push({ date: l.date.toISOString().slice(0, 10), load: l.internalLoad });
    loadsByPlayer.set(l.playerId, entry);
  }
  const highLoadPlayers = Array.from(loadsByPlayer.entries())
    .map(([playerId, v]) => {
      const acwr = computeAcwr(v.points);
      return { playerId, playerName: v.name, ratio: acwr.ratio, status: classifyLoadStatus(acwr.ratio) };
    })
    .filter((p) => p.status === "RISK")
    .slice(0, 8);

  // --- Proximos eventos ---
  const [nextMatchRow, nextTrainingRow, nextTournamentRow] = await Promise.all([
    prisma.match.findFirst({
      where: { clubId, date: { gte: now }, status: "SCHEDULED" },
      orderBy: { date: "asc" },
      select: { id: true, opponentName: true, date: true, team: { select: { name: true } } },
    }),
    prisma.trainingSession.findFirst({
      where: { clubId, date: { gte: now } },
      orderBy: { date: "asc" },
      select: { id: true, date: true, team: { select: { name: true } } },
    }),
    prisma.tournament.findFirst({
      where: { clubId, startDate: { gte: now } },
      orderBy: { startDate: "asc" },
      select: { id: true, name: true, startDate: true },
    }),
  ]);

  // --- Graficos ---
  const monthlyPayments = await prisma.payment.findMany({
    where: { clubId, status: "PAID", paymentDate: { gte: sixMonthsAgo } },
    select: { paymentDate: true, amount: true },
  });
  const revenueMap = new Map<string, number>();
  for (const p of monthlyPayments) {
    if (!p.paymentDate) continue;
    const key = monthKey(p.paymentDate);
    revenueMap.set(key, (revenueMap.get(key) ?? 0) + p.amount);
  }
  const monthlyRevenue = Array.from(revenueMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));

  const weeklyAttendance = await prisma.attendance.findMany({
    where: { trainingSession: { clubId, date: { gte: sixWeeksAgo } } },
    select: { status: true, trainingSession: { select: { date: true } } },
  });
  const weekMap = new Map<string, AttStatus[]>();
  for (const a of weeklyAttendance) {
    const key = weekKey(a.trainingSession.date);
    const arr = weekMap.get(key) ?? [];
    arr.push(a.status as AttStatus);
    weekMap.set(key, arr);
  }
  const attendanceByWeek = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, statuses]) => ({ week, percentage: attendancePercentage(statuses) ?? 0 }));

  return {
    activePlayers,
    activeTeams,
    totalCoaches,
    paymentsThisMonthTotal: paidThisMonth._sum.amount ?? 0,
    pendingPaymentsCount,
    pendingPaymentsTotal,
    overduePaymentsCount,
    overduePaymentsTotal,
    avgAttendancePercentage: overallPct,
    nextMatch: nextMatchRow
      ? { id: nextMatchRow.id, opponentName: nextMatchRow.opponentName, date: nextMatchRow.date, teamName: nextMatchRow.team.name }
      : null,
    nextTraining: nextTrainingRow
      ? { id: nextTrainingRow.id, date: nextTrainingRow.date, teamName: nextTrainingRow.team.name }
      : null,
    nextTournament: nextTournamentRow,
    alerts: {
      overduePlayers: Array.from(overdueByPlayer.entries())
        .map(([playerId, v]) => ({ playerId, ...v }))
        .sort((a, b) => b.debt - a.debt)
        .slice(0, 8),
      upcomingDuePlayers: Array.from(upcomingByPlayer.entries())
        .map(([playerId, v]) => ({ playerId, ...v }))
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        .slice(0, 8),
      lowAttendancePlayers,
      highLoadPlayers,
    },
    charts: {
      monthlyRevenue,
      delinquencyByCategory: Array.from(debtByCategory.entries()).map(([category, debt]) => ({ category, debt })),
      attendanceByWeek,
      playersByCategory: categories.map((c) => ({ category: c.name, count: c._count.players })),
    },
  };
}
