import "server-only";

/**
 * Cliente minimo para la API oficial de WhatsApp Business Cloud (Meta),
 * usado por el bot del club (punto 30 del maestro: "WhatsApp API"). No usa
 * ninguna libreria externa a proposito -- solo `fetch`, que ya viene
 * incluido en Next.js/Node -- para no depender de instalar paquetes nuevos.
 *
 * Variables de entorno necesarias (ver .env.example):
 * - WHATSAPP_ACCESS_TOKEN: token de acceso (Meta > WhatsApp > Configuracion de la API).
 * - WHATSAPP_PHONE_NUMBER_ID: Phone Number ID del numero del bot.
 */

const GRAPH_VERSION = "v21.0";

function getConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) {
    throw new Error(
      "Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID en las variables de entorno"
    );
  }
  return { accessToken, phoneNumberId };
}

async function graphFetch(path: string, init: RequestInit) {
  const { accessToken } = getConfig();
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // respuesta no-JSON (poco comun en esta API)
  }
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error("[WHATSAPP_API_ERROR]", res.status, text);
    throw new Error(`Error de la API de WhatsApp (${res.status}): ${json?.error?.message || text}`);
  }
  return json;
}

/** Normaliza un numero de WhatsApp a solo digitos, para poder compararlo con lo guardado en BD (guardians.phone, etc). */
export function normalizePhone(phone: string | null | undefined): string {
  return (phone || "").replace(/\D/g, "");
}

/** Envia un mensaje de texto simple. Devuelve el wamid (id del mensaje) para poder correlacionar respuestas. */
export async function sendWhatsAppText(to: string, body: string): Promise<string | null> {
  const { phoneNumberId } = getConfig();
  const json = await graphFetch(`${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body, preview_url: false },
    }),
  });
  return json?.messages?.[0]?.id ?? null;
}

/**
 * Reenvia una imagen ya recibida por el bot (por su media id de WhatsApp) a
 * otro numero, con un texto (caption) explicando que se necesita. Se usa
 * para reenviar el comprobante de pago al administrador del club.
 */
export async function sendWhatsAppImageByMediaId(
  to: string,
  mediaId: string,
  caption?: string
): Promise<string | null> {
  const { phoneNumberId } = getConfig();
  const json = await graphFetch(`${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: { id: mediaId, ...(caption ? { caption } : {}) },
    }),
  });
  return json?.messages?.[0]?.id ?? null;
}

/** Marca un mensaje entrante como leido (doble check azul). No es critico si falla. */
export async function markWhatsAppMessageRead(messageId: string): Promise<void> {
  const { phoneNumberId } = getConfig();
  await graphFetch(`${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  }).catch(() => {
    /* no es critico si falla marcar como leido */
  });
}

/** Descarga un archivo multimedia recibido por WhatsApp (ej. la foto de un comprobante de pago). */
export async function downloadWhatsAppMedia(
  mediaId: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const { accessToken } = getConfig();
  const meta = await graphFetch(mediaId, { method: "GET" });
  const url = meta?.url;
  const mimeType = meta?.mime_type || "application/octet-stream";
  if (!url) {
    throw new Error("No se pudo obtener la URL del archivo multimedia de WhatsApp");
  }

  const fileRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!fileRes.ok) {
    throw new Error(`No se pudo descargar el archivo multimedia de WhatsApp (${fileRes.status})`);
  }
  const arrayBuffer = await fileRes.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimeType };
}
