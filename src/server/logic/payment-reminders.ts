/**
 * Recordatorios de pago por WhatsApp (punto 13 del maestro: "Preparar
 * integracion futura con WhatsApp para enviar mensajes de cobro").
 * Modulo puro (sin base de datos ni red) para poder probarlo aislado.
 *
 * Calendario de envios (hora de Colombia) -- SOLO 2 mensajes al mes:
 * - Dia 30 de cada mes     -> REMINDER: recordatorio sutil de la mensualidad
 *   del mes SIGUIENTE (que vence el dia 5 de ese mes). En febrero, que no
 *   tiene dia 30, sale el ultimo dia (28 o 29).
 * - Dia 5 de cada mes      -> OVERDUE: aviso de que vencio el plazo de la
 *   mensualidad del mes ACTUAL (solo a quien no ha pagado completo).
 */

export type ReminderType = "REMINDER" | "OVERDUE";

export const DUE_DAY = 5;
export const REMINDER_DAY = 30;
const CLUB_TIMEZONE = "America/Bogota";

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export interface LocalDate {
  year: number;
  month: number; // 1-12
  day: number;
  lastDayOfMonth: number;
}

/** Fecha "de calendario" en Colombia para un instante dado (el servidor corre en UTC). */
export function localDate(now: Date = new Date(), timeZone = CLUB_TIMEZONE): LocalDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, day, lastDayOfMonth };
}

/** Que envio toca hoy (o null si hoy no toca ninguno). Febrero usa su ultimo dia (28/29). */
export function reminderTypeForDate(d: LocalDate): ReminderType | null {
  if (d.day === Math.min(REMINDER_DAY, d.lastDayOfMonth)) return "REMINDER";
  if (d.day === DUE_DAY) return "OVERDUE";
  return null;
}

/** Mes de la mensualidad a cobrar, en formato "YYYY-MM" (el que usa generateMonthlyCharges). */
export function targetMonthFor(type: ReminderType, d: LocalDate): string {
  let { year, month } = d;
  if (type === "REMINDER") {
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Mismo texto que genera generateMonthlyCharges para `periodLabel`
 * (ej. "octubre de 2026"), para poder buscar los cargos de ese mes.
 */
export function periodLabelFor(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Nombre del mes para el mensaje (ej. "octubre"). */
export function monthNameFor(month: string): string {
  const m = Number(month.split("-")[1]);
  return MONTHS_ES[m - 1];
}

/** 80000 -> "80.000" (el "$" ya va escrito en la plantilla de WhatsApp). */
export function formatCOP(value: number): string {
  return Math.round(value).toLocaleString("es-CO", { maximumFractionDigits: 0 }).replace(/,/g, ".");
}

/**
 * Convierte el telefono guardado (ej. "300 123 4567", "+57 300-123-4567")
 * al formato que exige WhatsApp: solo digitos con indicativo de pais.
 * Un celular colombiano de 10 digitos (empieza por 3) recibe el "57".
 * Devuelve null si el numero no parece valido.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("3")) digits = `57${digits}`;
  if (digits.length < 11 || digits.length > 15) return null;
  return digits;
}

/** ["Juliana", "Rafaela", "Ana"] -> "Juliana, Rafaela y Ana" (hermanos en un solo mensaje). */
export function joinNames(names: string[]): string {
  const unique = Array.from(new Set(names));
  if (unique.length <= 1) return unique[0] ?? "";
  return `${unique.slice(0, -1).join(", ")} y ${unique[unique.length - 1]}`;
}

/** Primer nombre (el mensaje suena mas cercano: "Hola Sandra" en vez del nombre completo). */
export function firstNameOnly(name: string | null | undefined): string {
  return (name || "").trim().split(/\s+/)[0] || "";
}
