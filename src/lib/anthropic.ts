import "server-only";

/**
 * Cliente minimo para la API de Claude (Anthropic), usado como "cerebro" del
 * bot de WhatsApp del club: responde preguntas generales y lee capturas de
 * comprobantes de pago. Igual que src/lib/whatsapp.ts, usa solo `fetch` para
 * no depender de instalar un paquete nuevo.
 *
 * Variables de entorno necesarias (ver .env.example):
 * - ANTHROPIC_API_KEY: llave de una cuenta de console.anthropic.com (aparte
 *   de la suscripcion normal de Claude.ai).
 * - ANTHROPIC_MODEL: nombre exacto del modelo, copiado de la consola (los
 *   nombres de modelo cambian con el tiempo, por eso no viene un valor fijo
 *   aqui -- ver el comentario en .env.example).
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

type ClaudeContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

async function callClaude(params: {
  system: string;
  content: string | ClaudeContentBlock[];
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY en las variables de entorno");
  if (!model) {
    throw new Error(
      "Falta ANTHROPIC_MODEL en las variables de entorno (copia el nombre exacto del modelo desde console.anthropic.com > Docs > Models)"
    );
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: params.maxTokens ?? 500,
      system: params.system,
      messages: [{ role: "user", content: params.content }],
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error("[ANTHROPIC_API_ERROR]", res.status, json);
    throw new Error(`Error de la API de Claude (${res.status}): ${json?.error?.message || "desconocido"}`);
  }

  const block = json?.content?.find((c: any) => c.type === "text");
  return (block?.text ?? "").trim();
}

/** Responde una pregunta general sobre el club, usando SOLO el contexto dado (evita inventar datos). */
export async function askClubQuestion(clubContext: string, question: string): Promise<string> {
  const system = [
    "Eres el asistente de WhatsApp de un club deportivo de baloncesto.",
    "Respondes preguntas de padres, jugadores y publico en general sobre el club, de forma breve, calida y en español.",
    "Usa SOLO la informacion que se te da a continuacion. Si preguntan algo que no esta ahi (datos de un jugador especifico, pagos de alguien, o algo que no sabes), responde amablemente que para eso deben escribir directamente al club o entrar a la plataforma, sin inventar datos.",
    "",
    "Informacion del club:",
    clubContext,
  ].join("\n");

  return callClaude({ system, content: question, maxTokens: 400 });
}

/** Describe (sin validar) lo que se ve en una captura de comprobante de pago, para ayudar al administrador a revisarla mas rapido. */
export async function describePaymentImage(base64: string, mimeType: string): Promise<string> {
  const system =
    "Eres un asistente que ayuda a un administrador de un club deportivo a revisar comprobantes de pago (capturas de transferencias bancarias o de apps como Nequi/Daviplata). Describe brevemente en español lo que ves en la imagen: monto, fecha, metodo/entidad y cualquier referencia o nombre visible. NO confirmes ni rechaces el pago, solo describe lo que se ve. Si la imagen no parece un comprobante de pago, dilo claramente. Maximo 3 lineas cortas.";

  return callClaude({
    system,
    content: [
      { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
      { type: "text", text: "Describe este comprobante de pago." },
    ],
    maxTokens: 300,
  });
}

export interface AdminReplyParsed {
  valid: boolean;
  month: number | null;
  year: number | null;
  playerNameHint: string | null;
}

/**
 * Interpreta la respuesta en lenguaje natural del administrador ("si, es de
 * agosto", "no ese no sirve", "valido, para Juliana en julio", etc.) y la
 * convierte en datos estructurados. Si Claude no devuelve un JSON valido,
 * cae a un analisis simple de "si/no" como respaldo.
 */
export async function parseAdminPaymentReply(
  replyText: string,
  currentDateISO: string,
  candidateNames: string[]
): Promise<AdminReplyParsed> {
  const system = [
    `Hoy es ${currentDateISO}.`,
    "Un administrador de un club deportivo esta respondiendo si un comprobante de pago es valido y a que mes corresponde.",
    candidateNames.length ? `Los posibles jugadores son: ${candidateNames.join(", ")}.` : "",
    'Responde UNICAMENTE con un JSON valido, sin texto adicional ni explicaciones, con este formato exacto:',
    '{"valid": true o false, "month": numero de 1 a 12 o null, "year": numero de 4 digitos o null, "playerNameHint": "nombre mencionado o null"}',
    'Si el administrador rechaza el comprobante o dice que no es valido, "valid" debe ser false.',
    'Si no menciona el mes, "month" debe ser null. Si no menciona el año, "year" debe ser null.',
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await callClaude({ system, content: replyText, maxTokens: 200 });

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);
    return {
      valid: !!parsed.valid,
      month: typeof parsed.month === "number" ? parsed.month : null,
      year: typeof parsed.year === "number" ? parsed.year : null,
      playerNameHint: typeof parsed.playerNameHint === "string" ? parsed.playerNameHint : null,
    };
  } catch {
    // Respaldo simple si Claude no devuelve JSON limpio: buscar "si"/"no" en el texto.
    const lower = replyText.toLowerCase();
    const hasNo = /\bno\b/.test(lower);
    const hasYes = /\b(si|sí|dale|correcto|listo|ok|valido|válido)\b/.test(lower);
    return { valid: hasYes && !hasNo, month: null, year: null, playerNameHint: null };
  }
}
