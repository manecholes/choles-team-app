/**
 * Carga interna de entrenamiento (punto 15). Modulo puro.
 *
 * Formula pedida explicitamente en el maestro: Carga = RPE x duracion.
 *
 * El semaforo de riesgo/fatiga usa el ACWR (Acute:Chronic Workload Ratio),
 * una heuristica estandar en ciencias del deporte para detectar picos de
 * carga peligrosos: se compara la carga de la ultima semana (aguda) contra
 * el promedio semanal de las ultimas 4 semanas (cronica). No reemplaza el
 * criterio profesional de un preparador fisico; se documenta como
 * heuristica de apoyo, no como diagnostico medico.
 */

export function computeInternalLoad(rpe: number, durationMinutes: number): number {
  if (rpe < 0 || rpe > 10) throw new Error("El RPE debe estar entre 0 y 10");
  if (durationMinutes < 0) throw new Error("La duracion no puede ser negativa");
  return Math.round(rpe * durationMinutes);
}

export interface LoadPoint {
  date: string; // ISO yyyy-mm-dd
  load: number;
}

export type LoadStatus = "OPTIMAL" | "ATTENTION" | "RISK";

/**
 * Agrupa cargas diarias en semanas (lunes-domingo, semana ISO simplificada
 * por bloques de 7 dias desde la fecha mas antigua) y calcula ACWR entre
 * la ultima semana completa y el promedio de las 4 anteriores.
 */
export function computeAcwr(points: LoadPoint[]): { acute: number; chronic: number; ratio: number | null } {
  if (points.length === 0) return { acute: 0, chronic: 0, ratio: null };

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const msPerDay = 24 * 60 * 60 * 1000;
  const lastDate = new Date(sorted[sorted.length - 1].date).getTime();

  function sumWithinDays(fromDaysAgo: number, toDaysAgo: number): number {
    return sorted.reduce((acc, p) => {
      const diffDays = (lastDate - new Date(p.date).getTime()) / msPerDay;
      if (diffDays >= toDaysAgo && diffDays < fromDaysAgo) return acc + p.load;
      return acc;
    }, 0);
  }

  const acuteTotal = sumWithinDays(7, 0); // ultimos 7 dias
  const chronicTotal = sumWithinDays(28, 0); // ultimas 4 semanas
  const acute = acuteTotal;
  const chronic = chronicTotal / 4;

  if (chronic === 0) {
    return { acute, chronic, ratio: null };
  }

  return { acute, chronic, ratio: Math.round((acute / chronic) * 100) / 100 };
}

export function classifyLoadStatus(ratio: number | null): LoadStatus {
  if (ratio === null) return "OPTIMAL";
  if (ratio >= 0.8 && ratio <= 1.3) return "OPTIMAL";
  if (ratio > 1.3 && ratio <= 1.5) return "ATTENTION";
  if (ratio < 0.8) return "ATTENTION";
  return "RISK"; // ratio > 1.5 : pico de carga asociado a mayor riesgo de lesion
}
