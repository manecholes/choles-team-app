import { NextRequest, NextResponse } from "next/server";
import { runPaymentReminders } from "@/server/services/payment-reminder.service";

/**
 * Recordatorios automaticos de mensualidad por WhatsApp.
 *
 * Lo llama a las 6:00 p.m. (hora Colombia) la tarea programada de GitHub
 * Actions (.github/workflows/payment-reminders.yml). Solo 2 envios al mes:
 *   - dia 30 (en febrero, su ultimo dia) -> recordatorio sutil
 *   - dia 5                              -> aviso de pago vencido
 *   - cualquier otro dia                 -> no hace nada
 *
 * No usa la sesion del login (la llama un robot, no una persona); se
 * protege con la variable CRON_SECRET, que debe ser IDENTICA en Railway y
 * en los "secrets" del repositorio de GitHub.
 *
 * Parametros opcionales (?type=...&dryRun=1&month=YYYY-MM):
 *   type   = auto (defecto) | reminder | overdue
 *   dryRun = 1 -> solo lista a quien le llegaria, no envia nada
 */

export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const params = req.nextUrl.searchParams;
    const rawType = (params.get("type") || "auto").toUpperCase();
    const type = rawType === "REMINDER" || rawType === "OVERDUE" ? rawType : "AUTO";
    const month = params.get("month") || undefined;
    if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return NextResponse.json({ error: "month debe tener formato YYYY-MM" }, { status: 400 });
    }
    const dryRun = ["1", "true", "si"].includes((params.get("dryRun") || "").toLowerCase());

    const result = await runPaymentReminders({ type, month, dryRun });
    return NextResponse.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[PAYMENT_REMINDERS_ERROR]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error enviando recordatorios" },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;
