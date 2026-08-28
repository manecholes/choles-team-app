import "server-only";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { evaluationSchema, loadEntrySchema } from "@/server/validators/evaluation";
import { computeInternalLoad, computeAcwr, classifyLoadStatus, type LoadPoint } from "@/server/logic/load";
import { attendancePercentage, type AttendanceStatus as AttStatus } from "@/server/logic/attendance";

type EvaluationInput = z.infer<typeof evaluationSchema>;
type LoadEntryInput = z.infer<typeof loadEntrySchema>;

function weekKey(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  return copy.toISOString().slice(0, 10);
}

export async function listEvaluations(clubId: number, filters: { playerId?: number } = {}) {
  return prisma.evaluation.findMany({
    where: { clubId, ...(filters.playerId ? { playerId: filters.playerId } : {}) },
    include: {
      tests: true,
      player: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { date: "desc" },
  });
}

/** Crea una evaluacion con sus pruebas fisicas y refleja cada prueba en performance_metrics para graficar su evolucion. */
export async function createEvaluation(clubId: number, evaluatorId: number | null, data: EvaluationInput) {
  return prisma.$transaction(async (tx) => {
    const evaluation = await tx.evaluation.create({
      data: { clubId, playerId: data.playerId, date: data.date, evaluatorId, notes: data.notes || null },
    });

    for (const t of data.tests) {
      await tx.physicalTest.create({
        data: {
          evaluationId: evaluation.id,
          category: t.category,
          testName: t.testName,
          value: t.value,
          unit: t.unit,
          notes: t.notes || null,
        },
      });
      await tx.performanceMetric.create({
        data: { clubId, playerId: data.playerId, metricKey: t.testName, date: data.date, value: t.value },
      });
    }

    return tx.evaluation.findUniqueOrThrow({ where: { id: evaluation.id }, include: { tests: true } });
  });
}

/** Registra RPE + duracion (carga interna = RPE x duracion, punto 15). */
export async function createLoadEntry(clubId: number, data: LoadEntryInput) {
  const internalLoad = computeInternalLoad(data.rpe, data.durationMinutes);
  return prisma.loadEntry.create({
    data: {
      clubId,
      playerId: data.playerId,
      date: data.date,
      rpe: data.rpe,
      durationMinutes: data.durationMinutes,
      internalLoad,
      trainingSessionId: data.trainingSessionId || null,
      matchId: data.matchId || null,
    },
  });
}

const METRIC_LABELS: Record<string, string> = {
  Peso: "Peso (kg)",
  Altura: "Altura (cm)",
  IMC: "IMC",
  Envergadura: "Envergadura (cm)",
  "10m": "Velocidad 10m (s)",
  "20m": "Velocidad 20m (s)",
  "T-Test": "Agilidad T-Test (s)",
  "5-10-5": "Agilidad 5-10-5 (s)",
  Illinois: "Agilidad Illinois (s)",
  "Salto vertical": "Salto vertical (cm)",
  CMJ: "CMJ (cm)",
  "Yo-Yo": "Resistencia Yo-Yo (m)",
  "30-15 VIFT": "30-15 VIFT (km/h)",
};

/** Perfil de rendimiento de un jugador (punto 16): evolucion de metricas, carga/RPE, semaforo y asistencia. */
export async function getPerformanceProfile(clubId: number, playerId: number) {
  const player = await prisma.player.findFirstOrThrow({
    where: { id: playerId, clubId },
    select: { id: true, firstName: true, lastName: true },
  });

  const metrics = await prisma.performanceMetric.findMany({
    where: { clubId, playerId },
    orderBy: { date: "asc" },
  });
  const byKey = new Map<string, Array<{ date: string; value: number }>>();
  for (const m of metrics) {
    const arr = byKey.get(m.metricKey) ?? [];
    arr.push({ date: m.date.toISOString().slice(0, 10), value: m.value });
    byKey.set(m.metricKey, arr);
  }
  const metricSeries = Array.from(byKey.entries()).map(([key, points]) => ({
    key,
    label: METRIC_LABELS[key] ?? key,
    points,
  }));

  const loadEntries = await prisma.loadEntry.findMany({
    where: { clubId, playerId },
    orderBy: { date: "asc" },
  });
  const loadPoints: LoadPoint[] = loadEntries.map((l) => ({
    date: l.date.toISOString().slice(0, 10),
    load: l.internalLoad,
  }));
  const rpePoints = loadEntries.map((l) => ({ date: l.date.toISOString().slice(0, 10), value: l.rpe }));
  const acwr = computeAcwr(loadPoints);
  const status = classifyLoadStatus(acwr.ratio);

  const attendanceRows = await prisma.attendance.findMany({
    where: { playerId },
    select: { status: true, trainingSession: { select: { date: true } } },
    orderBy: { trainingSession: { date: "asc" } },
  });
  const overallAttendance = attendancePercentage(attendanceRows.map((a) => a.status as AttStatus));
  const weekMap = new Map<string, AttStatus[]>();
  for (const a of attendanceRows) {
    const key = weekKey(a.trainingSession.date);
    const arr = weekMap.get(key) ?? [];
    arr.push(a.status as AttStatus);
    weekMap.set(key, arr);
  }
  const attendanceByWeek = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, statuses]) => ({ week, percentage: attendancePercentage(statuses) ?? 0 }));

  return {
    player,
    metricSeries,
    loadPoints,
    rpePoints,
    acwr,
    status,
    overallAttendance,
    attendanceByWeek,
  };
}
