import "server-only";
import { prisma } from "@/lib/prisma";
import { generateMonthlyCharges } from "@/server/services/payment.service";
import { outstandingBalance } from "@/server/logic/cartera";
import {
  type ReminderType,
  firstNameOnly,
  formatCOP,
  joinNames,
  localDate,
  monthNameFor,
  periodLabelFor,
  reminderTypeForDate,
  targetMonthFor,
  toWhatsAppNumber,
} from "@/server/logic/payment-reminders";

/**
 * Envia los recordatorios de mensualidad por WhatsApp usando PLANTILLAS
 * aprobadas por Meta (obligatorio para escribirle a alguien que no le ha
 * escrito al club en las ultimas 24 horas).
 *
 * Plantillas (categoria "Utilidad", idioma Espanol), 4 variables en orden:
 *   {{1}} nombre del acudiente, {{2}} mes, {{3}} jugador(es), {{4}} valor
 * - WHATSAPP_TEMPLATE_REMINDER (por defecto "recordatorio_pago") -> dia 30 (febrero: su ultimo dia)
 * - WHATSAPP_TEMPLATE_OVERDUE  (por defecto "pago_vencido")      -> dia 5
 * - WHATSAPP_TEMPLATE_LANG     (por defecto "es")
 *
 * Reglas:
 * - Solo cargos de Mensualidad de jugadores ACTIVOS que no esten pagados completos.
 * - Un solo mensaje por telefono: si una mama tiene 2 hijos, recibe uno con
 *   los dos nombres y la suma de lo que debe.
 * - Nunca envia dos veces el mismo aviso por el mismo cargo (queda registro
 *   en audit_logs), asi que es seguro ejecutarlo varias veces el mismo dia.
 */

const GRAPH_VERSION = "v21.0";
const AUDIT_ACTION: Record<ReminderType, string> = {
  REMINDER: "WHATSAPP_PAYMENT_REMINDER",
  OVERDUE: "WHATSAPP_PAYMENT_OVERDUE",
};

export interface RunRemindersOptions {
  /** "AUTO" decide segun la fecha de hoy en Colombia. */
  type?: ReminderType | "AUTO";
  /** Forzar otro mes ("YYYY-MM"); normalmente se deja vacio. */
  month?: string;
  /** true = solo muestra a quien le llegaria, NO envia nada. */
  dryRun?: boolean;
  now?: Date;
}

interface Recipient {
  phone: string;
  guardianName: string;
  playerNames: string[];
  total: number;
  paymentIds: number[];
}

function templateConfig(type: ReminderType) {
  return {
    name:
      type === "REMINDER"
        ? process.env.WHATSAPP_TEMPLATE_REMINDER || "recordatorio_pago"
        : process.env.WHATSAPP_TEMPLATE_OVERDUE || "pago_vencido",
    language: process.env.WHATSAPP_TEMPLATE_LANG || "es",
  };
}

async function sendTemplate(to: string, type: ReminderType, params: string[]): Promise<string | null> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) {
    throw new Error("Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID en las variables de entorno");
  }
  const { name, language } = templateConfig(type);
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name,
        language: { code: language },
        components: [
          {
            type: "body",
            parameters: params.map((text) => ({ type: "text", text })),
          },
        ],
      },
    }),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* respuesta no-JSON */
  }
  if (!res.ok) {
    throw new Error(json?.error?.message || `Error ${res.status}`);
  }
  return json?.messages?.[0]?.id ?? null;
}

/** Resumen corto al WhatsApp del administrador. No es critico si falla (Meta solo deja escribir texto libre si el admin le escribio al bot en las ultimas 24 h). */
async function notifyAdmin(summary: string) {
  const adminPhone = toWhatsAppNumber(process.env.WHATSAPP_ADMIN_PHONE);
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!adminPhone || !accessToken || !phoneNumberId) return;
  await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: adminPhone,
      type: "text",
      text: { body: summary, preview_url: false },
    }),
  }).catch(() => undefined);
}

export async function runPaymentReminders(opts: RunRemindersOptions = {}) {
  const now = opts.now ?? new Date();
  const today = localDate(now);
  const type = !opts.type || opts.type === "AUTO" ? reminderTypeForDate(today) : opts.type;
  const todayLabel = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;

  if (!type) {
    return { skipped: true, reason: `Hoy (${todayLabel}) no toca enviar recordatorios`, today: todayLabel };
  }

  const month = opts.month || targetMonthFor(type, today);
  const periodLabel = periodLabelFor(month);
  const dryRun = !!opts.dryRun;

  const club = await prisma.club.findFirstOrThrow({
    where: { slug: process.env.WHATSAPP_CLUB_SLUG || "choles-team" },
  });

  // El dia 30 los cargos del mes siguiente todavia no existen (se crean al
  // entrar a /pagos), asi que se generan aqui. Nunca duplica cargos.
  if (type === "REMINDER" && !dryRun) {
    const admin = await prisma.user.findFirst({
      where: { clubId: club.id, role: "ADMIN", active: true },
      orderBy: { id: "asc" },
    });
    if (admin) await generateMonthlyCharges(club.id, admin.id, { month });
  }

  const payments = await prisma.payment.findMany({
    where: {
      clubId: club.id,
      periodLabel,
      status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
      concept: { type: "MENSUALIDAD" },
      player: { status: "ACTIVE" },
    },
    include: {
      player: {
        select: {
          firstName: true,
          lastName: true,
          guardians: {
            orderBy: { isPrimaryContact: "desc" },
            select: { guardian: { select: { firstName: true, phone: true } } },
          },
        },
      },
    },
  });

  const alreadySent = await prisma.auditLog.findMany({
    where: { clubId: club.id, action: AUDIT_ACTION[type], entity: "Payment", entityId: { in: payments.map((p) => p.id) } },
    select: { entityId: true },
  });
  const sentIds = new Set(alreadySent.map((a) => a.entityId));

  const byPhone = new Map<string, Recipient>();
  const withoutPhone: string[] = [];
  let skippedAlreadySent = 0;

  for (const p of payments) {
    const balance = outstandingBalance(p);
    if (balance <= 0) continue;
    if (sentIds.has(p.id)) {
      skippedAlreadySent++;
      continue;
    }
    const playerFullName = `${p.player.firstName} ${p.player.lastName}`.trim();
    // Primer acudiente con un celular valido (el contacto principal va primero).
    const contact = p.player.guardians
      .map((g) => ({ name: g.guardian.firstName, phone: toWhatsAppNumber(g.guardian.phone) }))
      .find((g) => g.phone);
    if (!contact?.phone) {
      withoutPhone.push(playerFullName);
      continue;
    }
    const r = byPhone.get(contact.phone) ?? {
      phone: contact.phone,
      guardianName: firstNameOnly(contact.name),
      playerNames: [],
      total: 0,
      paymentIds: [],
    };
    r.playerNames.push(firstNameOnly(p.player.firstName));
    r.total += balance;
    r.paymentIds.push(p.id);
    byPhone.set(contact.phone, r);
  }

  const monthName = monthNameFor(month);
  const results: { phone: string; guardian: string; players: string; total: string; ok: boolean; error?: string }[] = [];

  for (const r of Array.from(byPhone.values())) {
    const players = joinNames(r.playerNames);
    const total = formatCOP(r.total);
    const base = { phone: r.phone, guardian: r.guardianName, players, total };
    if (dryRun) {
      results.push({ ...base, ok: true });
      continue;
    }
    try {
      const wamid = await sendTemplate(r.phone, type, [r.guardianName || "familia", monthName, players, total]);
      await prisma.auditLog.createMany({
        data: r.paymentIds.map((id) => ({
          clubId: club.id,
          action: AUDIT_ACTION[type],
          entity: "Payment",
          entityId: id,
          metadata: JSON.stringify({ to: r.phone, wamid, month }),
        })),
      });
      results.push({ ...base, ok: true });
    } catch (err) {
      results.push({ ...base, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  if (!dryRun && (sent > 0 || failed.length > 0 || withoutPhone.length > 0)) {
    const title = type === "REMINDER" ? "Recordatorio de pago" : "Aviso de pago vencido";
    const lines = [
      `Choles Team - ${title} (${monthName})`,
      `Enviados: ${sent}`,
      failed.length ? `Fallaron: ${failed.length} (${failed.map((f) => f.players).join(", ")})` : "",
      withoutPhone.length ? `Sin celular del acudiente: ${withoutPhone.join(", ")}` : "",
    ].filter(Boolean);
    await notifyAdmin(lines.join("\n"));
  }

  return {
    skipped: false,
    type,
    today: todayLabel,
    month,
    periodLabel,
    dryRun,
    sent: dryRun ? 0 : sent,
    wouldSend: dryRun ? results.length : undefined,
    failed,
    withoutPhone,
    skippedAlreadySent,
    recipients: results,
  };
}
