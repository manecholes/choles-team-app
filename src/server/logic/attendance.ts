/**
 * Calculo de asistencia (punto 9). Modulo puro, sin dependencias externas.
 *
 * Definicion adoptada (documentada aqui para que todo el equipo use el
 * mismo criterio): un jugador "asiste" si su estado es PRESENT o LATE.
 * Las sesiones EXCUSED (justificadas) SI cuentan en el denominador porque
 * siguen siendo una sesion programada para el jugador, pero se muestran
 * aparte para que el entrenador distinga inasistencia justificada de
 * injustificada.
 */

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

export interface AttendanceCounts {
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
}

export function countAttendance(statuses: AttendanceStatus[]): AttendanceCounts {
  const counts: AttendanceCounts = { present: 0, late: 0, absent: 0, excused: 0, total: statuses.length };
  for (const s of statuses) {
    if (s === "PRESENT") counts.present++;
    else if (s === "LATE") counts.late++;
    else if (s === "ABSENT") counts.absent++;
    else if (s === "EXCUSED") counts.excused++;
  }
  return counts;
}

/** Porcentaje de asistencia (0-100), redondeado a 1 decimal. Retorna null si no hay registros. */
export function attendancePercentage(statuses: AttendanceStatus[]): number | null {
  if (statuses.length === 0) return null;
  const { present, late, total } = countAttendance(statuses);
  return Math.round(((present + late) / total) * 1000) / 10;
}

/** Umbral de alerta de baja asistencia usado en el dashboard (punto 4). */
export const LOW_ATTENDANCE_THRESHOLD = 70;

export function isLowAttendance(percentage: number | null): boolean {
  return percentage !== null && percentage < LOW_ATTENDANCE_THRESHOLD;
}
