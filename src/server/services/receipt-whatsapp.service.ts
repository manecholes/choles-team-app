import "server-only";
import { prisma } from "@/lib/prisma";
import { generateReceiptPdf } from "@/lib/pdf";
import { firstNameOnly, toWhatsAppNumber } from "@/server/logic/payment-reminders";

/**
 * Envia el recibo de pago en PDF por WhatsApp cuando un cargo queda PAGADO.
 *
 * Usa la plantilla aprobada por Meta "recibo_pago" (categoria Utilidad,
 * idioma "es"), con encabezado tipo DOCUMENTO (el PDF) y 5 variables:
 *   {{1}} nombre del acudiente, {{2}} concepto + periodo, {{3}} jugador,
 *   {{4}} valor (sin el signo $, que ya va en la plantilla), {{5}} numero de recibo.
 *
 * Variables de entorno:
 * - WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID (las mismas de los recordatorios)
 * - WHATSAPP_TEMPLATE_RECEIPT (por defecto "recibo_pago")
 * - WHATSAPP_TEMPLATE_LANG (por defecto "es")
 *
 * Reglas:
 * - Se le envia al primer acudiente con celular valido; si ninguno tiene, al celular del jugador.
 * - Nunca se envia dos veces el mismo recibo (queda registro en audit_logs),
 *   salvo que se pida explicitamente un reenvio (force = true).
 * - NUNCA lanza error: si WhatsApp falla, el pago igual queda guardado y se
 *   devuelve { ok: false, error } para mostrarlo en pantalla.
 */

const GRAPH_VERSION = "v21.0";
const AUDIT_ACTION = "WHATSAPP_RECEIPT";

export interface ReceiptWhatsAppResult {
  ok: boolean;
  skipped?: "already_sent" | "not_paid";
  to?: string;
  guardian?: string;
  error?: string;
}

function config() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) {
    throw new Error("Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID en las variables de entorno");
  }
  return {
    accessToken,
    phoneNumberId,
    template: process.env.WHATSAPP_TEMPLATE_RECEIPT || "recibo_pago",
    language: process.env.WHATSAPP_TEMPLATE_LANG || "es",
  };
}

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

/** Sube el PDF a WhatsApp y devuelve el id del archivo (media id). */
async function uploadPdf(pdf: Uint8Array, filename: string): Promise<string> {
  const { accessToken, phoneNumberId } = config();
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "application/pdf");
  form.append("file", new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), filename);
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  const json = await readJson(res);
  if (!res.ok || !json?.id) {
    throw new Error(json?.error?.message || `No se pudo subir el PDF a WhatsApp (${res.status})`);
  }
  return json.id as string;
}

async function sendReceiptTemplate(to: string, mediaId: string, filename: string, params: string[]): Promise<string | null> {
  const { accessToken, phoneNumberId, template, language } = config();
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template,
        language: { code: language },
        components: [
          { type: "header", parameters: [{ type: "document", document: { id: mediaId, filename } }] },
          { type: "body", parameters: params.map((text) => ({ type: "text", text })) },
        ],
      },
    }),
  });
  const json = await readJson(res);
  if (!res.ok) {
    throw new Error(json?.error?.message || `Error de WhatsApp (${res.status})`);
  }
  return json?.messages?.[0]?.id ?? null;
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export async function sendReceiptWhatsApp(
  clubId: number,
  paymentId: number,
  opts: { userId?: number | null; force?: boolean } = {}
): Promise<ReceiptWhatsAppResult> {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, clubId },
      include: {
        club: { select: { name: true } },
        concept: { select: { name: true } },
        player: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            guardians: { select: { guardian: { select: { firstName: true, phone: true } } } },
          },
        },
      },
    });
    if (!payment) return { ok: false, error: "Pago no encontrado" };
    if (payment.status !== "PAID") return { ok: false, skipped: "not_paid" };

    if (!opts.force) {
      const already = await prisma.auditLog.findFirst({
        where: { clubId, action: AUDIT_ACTION, entity: "Payment", entityId: paymentId },
        select: { id: true },
      });
      if (already) return { ok: true, skipped: "already_sent" };
    }

    const guardianContact = payment.player.guardians
      .map((g: { guardian: { firstName: string; phone: string | null } }) => ({ name: g.guardian.firstName, phone: toWhatsAppNumber(g.guardian.phone) }))
      .find((g: { name: string; phone: string | null }) => g.phone);
    const contact = guardianContact ?? { name: "", phone: toWhatsAppNumber(payment.player.phone) };
    if (!contact.phone) {
      return { ok: false, error: "El jugador no tiene celular de acudiente registrado" };
    }

    const registeredBy = payment.registeredById
      ? await prisma.user.findUnique({ where: { id: payment.registeredById }, select: { email: true } })
      : null;
    const playerName = `${payment.player.firstName} ${payment.player.lastName}`.trim();
    const pdf = await generateReceiptPdf({
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
    const mediaId = await uploadPdf(pdf, filename);
    const guardianName = firstNameOnly(contact.name) || "familia";
    const concept = [payment.concept.name, payment.periodLabel ? capitalize(payment.periodLabel) : ""].filter(Boolean).join(" ");
    const wamid = await sendReceiptTemplate(contact.phone, mediaId, filename, [
      guardianName,
      concept,
      playerName,
      payment.amount.toLocaleString("es-CO", { maximumFractionDigits: 0 }),
      payment.receiptNumber,
    ]);

    await prisma.auditLog.create({
      data: {
        clubId,
        userId: opts.userId ?? null,
        action: AUDIT_ACTION,
        entity: "Payment",
        entityId: paymentId,
        metadata: JSON.stringify({ to: contact.phone, wamid, force: !!opts.force }),
      },
    });

    return { ok: true, to: contact.phone, guardian: guardianName };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[WHATSAPP_RECEIPT_ERROR]", paymentId, message);
    return { ok: false, error: message };
  }
}
