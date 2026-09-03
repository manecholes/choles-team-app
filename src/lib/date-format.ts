/**
 * Formatea una fecha "de calendario" (un dia, sin hora: fecha de un partido,
 * entrenamiento, torneo, vencimiento de pago, etc).
 *
 * Estas fechas se guardan a partir de un <input type="date"> (ej. "2026-09-03"),
 * lo que el navegador y luego Zod (z.coerce.date()) interpretan como
 * 2026-09-03T00:00:00.000Z (medianoche UTC). Si al mostrarlas se usa la zona
 * horaria LOCAL del navegador (Colombia = UTC-5), esa medianoche UTC cae en
 * la tarde/noche del dia ANTERIOR, y la fecha se ve corrida un dia hacia atras
 * (ej. se guarda "3 de septiembre" pero se muestra "2 de septiembre").
 *
 * La solucion es formatear siempre estas fechas usando UTC: como se guardaron
 * a medianoche UTC del dia elegido, formatear en UTC muestra exactamente ese
 * dia sin importar en que zona horaria este el navegador o el servidor.
 *
 * IMPORTANTE: usar esta funcion solo para fechas "de calendario" (sin hora).
 * No usarla para marcas de tiempo reales (ej. la hora exacta en que se subio
 * un documento), donde sí se quiere la hora local del usuario.
 */
export function formatDateCO(value: string | Date, options: Intl.DateTimeFormatOptions = {}): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("es-CO", { timeZone: "UTC", ...options });
}
