import "server-only";
import { prisma } from "@/lib/prisma";
import { generateReceiptPdf } from "@/lib/pdf";
import { firstNameOnly, formatCOP, toWhatsAppNumber } from "@/server/logic/payment-reminders";

/**
 * Envia el recibo de pago (PDF) por WhatsApp al acudiente del jugador en el
 * momento en que el club marca un pago como PAGADO.
 *
 * Usa una PLANTILLA aprobada por Meta (obligatorio para escribirle a alguien
 * que no le ha escrito al club en las ultimas 24 horas):
 * - WHATSAPP_TEMPLATE_RECEIPT (por defecto "recibo_pago"), categoria Utilidad,
 *   idioma Espanol (WHATSAPP_TEMPLATE_LANG, por defecto "es").
 * - Encabezado: DOCUMENTO (el PDF del recibo).
 * - Cuerpo, 5 variables en orden:
 *   {{1}} acudiente, {{2}} concepto (ej. "Mensualidad octubre de 2026"),
 *   {{3}} jugador, {{4}} valor (ej. "80.000"), {{5}} numero de recibo.
 *
 * Reglas:
 * - Se envia al primer acudiente con celular valido (el contacto principal va primero),
 *   igual que los recordatorios de mensualidad.
 * - Nunca envia dos veces el recibo del mismo pago (queda registro en audit_logs
 *   con la accion WHATSAPP_RECEIPT), salvo que se pida explicitamente con `force`.
 * - Si falla, NO rompe el registro del pago: solo devuelve el error para mostrarlo.
 */

const GRAPH_VERSION = "v21.0";
const AUDIT_ACTION = "WHATSAPP_RECEIPT";

export interface ReceiptWhatsAppResult {
  sent: boolean;
  to?: string;
  guardian?: string;
  reason?: string;
}

function getConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) {
    throw new Error("Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID en las variables de entorno");
  }
  return { accessToken, phoneNumberId };
}

async function readGraphResponse(res: Response) {
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* respuesta no-JSON */
  }
  if (!res.ok) {
    throw new Error(json?.error?.message || `Error ${res.status} de la API de WhatsApp`);
  }
  return json;
}

/** Sube el PDF a WhatsApp y devuelve el media id (valido por 30 dias en Meta). */
async function uploadPdf(bytes: Uint8Array, filename: string): Promise<string> {
  const { accessToken, phoneNumberId } = getConfig();
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "application/pdf");
  form.append("file", new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), filename);
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  const json = await readGraphResponse(res);
  if (!json?.id) throw new Error("WhatsApp no devolvio el id del archivo subido");
  return json.id as string;
}

async function sendReceiptTemplate(
  to: string,
  mediaId: string,
  filename: string,
  params: string[]
): Promise<string | null> {
  const { accessToken, phoneNumberId } = getConfig();
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE_RECEIPT || "recibo_pago",
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "es" },
        components: [
          {
            type: "header",
            parameters: [{ type: "document", document: { id: mediaId, filename } }],
          },
          {
            type: "body",
            parameters: params.map((text) => ({ type: "text", text })),
          },
        ],
      },
    }),
  });
  const json = await readGraphResponse(res);
  return json?.messages?.[0]?.id ?? null;
}

/** "Mensualidad" + "octubre de 2026" -> "Mensualidad octubre de 2026" (sin repetir si ya lo trae). */
function conceptLabel(conceptName: string, periodLabel: string | null): string {
  if (!periodLabel || conceptName.toLowerCase().includes(periodLabel.toLowerCase())) return conceptName;
  return `${conceptName} ${periodLabel}`;
}

export async function sendPaymentReceiptWhatsApp(
  clubId: number,
  paymentId: number,
  opts: { force?: boolean } = {}
): Promise<ReceiptWhatsAppResult> {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, clubId },
      include: {
        club: true,
        concept: true,
        player: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            guardians: {
              orderBy: { isPrimaryContact: "desc" },
              select: { guardian: { select: { firstName: true, phone: true } } },
            },
          },
        },
      },
    });
    if (!payment) return { sent: false, reason: "Pago no encontrado" };
    if (payment.status !== "PAID") return { sent: false, reason: "El pago no esta marcado como pagado" };

    if (!opts.force) {
      const already = await prisma.auditLog.findFirst({
        where: { clubId, action: AUDIT_ACTION, entity: "Payment", entityId: payment.id },
        select: { id: true },
      });
      if (already) return { sent: false, reason: "El recibo ya se habia enviado por WhatsApp" };
    }

    // Primer acudiente con celular valido; si ninguno tiene, el celular del jugador.
    const playerPhone = toWhatsAppNumber(payment.player.phone);
    const contact =
      payment.player.guardians
        .map((g) => ({ name: g.guardian.firstName, phone: toWhatsAppNumber(g.guardian.phone) }))
        .find((g) => g.phone) ?? (playerPhone ? { name: "", phone: playerPhone } : undefined);
    const playerName = `${payment.player.firstName} ${payment.player.lastName}`.trim();
    if (!contact?.phone) {
      return { sent: false, reason: `${playerName} no tiene celular registrado (ni del acudiente ni del jugador)` };
    }

    const registeredBy = payment.registeredById
      ? await prisma.user.findUnique({ where: { id: payment.registeredById }, select: { email: true } })
      : null;

    const pdfBytes = await generateReceiptPdf({
      receiptNumber: payment.receiptNumber,
      clubName: payment.club.name,
      playerName,
      conceptName: payment.concept.name,
      amount: payment.amount,
      method: payment.method,
      paymentDate: payment.paymentDate,
      periodLabel: payment.periodLabel,
      registeredByEmail: registeredBy?.email ?? null,
    });

    const filename = `Recibo-${payment.receiptNumber}.pdf`;
    const mediaId = await uploadPdf(pdfBytes, filename);
    const guardianName = firstNameOnly(contact.name) || "familia";
    const wamid = await sendReceiptTemplate(contact.phone, mediaId, filename, [
      guardianName,
      conceptLabel(payment.concept.name, payment.periodLabel),
      firstNameOnly(payment.player.firstName) || playerName,
      formatCOP(payment.amount),
      payment.receiptNumber,
    ]);

    await prisma.auditLog.create({
      data: {
        clubId,
        action: AUDIT_ACTION,
        entity: "Payment",
        entityId: payment.id,
        metadata: JSON.stringify({ to: contact.phone, wamid }),
      },
    });

    return { sent: true, to: contact.phone, guardian: guardianName };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[RECEIPT_WHATSAPP_ERROR]", err);
    return { sent: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
