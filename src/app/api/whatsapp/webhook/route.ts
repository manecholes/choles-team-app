import { NextRequest, NextResponse } from "next/server";
import { handleIncomingWhatsAppMessage } from "@/server/services/whatsappBot.service";

/**
 * Webhook oficial de WhatsApp Business Cloud API (Meta) del club (punto 30
 * del maestro). Esta ruta es publica (Meta la llama directamente, sin
 * sesion de usuario) -- la unica proteccion es el WHATSAPP_VERIFY_TOKEN en
 * la verificacion inicial (GET) y, en el futuro, la firma de la peticion
 * (X-Hub-Signature-256) que todavia no se valida en esta primera version.
 */

/** Verificacion inicial que Meta hace una sola vez al guardar la URL en Meta > WhatsApp > Configuracion > Webhook. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Token de verificacion invalido", { status: 403 });
}

/**
 * Recibe los eventos de WhatsApp (mensajes entrantes, confirmaciones de
 * lectura, etc). Siempre responde 200 rapido para que Meta no reintente el
 * mismo evento -- el procesamiento real ocurre aparte y cualquier error se
 * registra en consola sin afectar la respuesta.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    const entries = body?.entry ?? [];
    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        const value = change?.value;
        const messages = value?.messages ?? [];
        const contactName = value?.contacts?.[0]?.profile?.name;
        for (const message of messages) {
          await handleIncomingWhatsAppMessage(message, contactName).catch((err: unknown) => {
            // eslint-disable-next-line no-console
            console.error("[WHATSAPP_WEBHOOK] Error procesando mensaje", err);
          });
        }
        // value.statuses trae confirmaciones de entrega/lectura de mensajes
        // que el bot envio -- no requieren accion, se ignoran a proposito.
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[WHATSAPP_WEBHOOK] Error general", err);
  }

  return NextResponse.json({ ok: true });
}
