import "server-only";
import { prisma } from "@/lib/prisma";
import {
  downloadWhatsAppMedia,
  markWhatsAppMessageRead,
  normalizePhone,
  sendWhatsAppImageByMediaId,
  sendWhatsAppText,
} from "@/lib/whatsapp";
import { askClubQuestion, describePaymentImage, parseAdminPaymentReply } from "@/lib/anthropic";
import { saveBase64File } from "@/lib/storage";
import { createPayment } from "@/server/services/payment.service";

/**
 * Bot de WhatsApp del club (punto 30 del maestro): responde preguntas
 * generales y procesa comprobantes de pago.
 *
 * Flujo de comprobantes de pago (a proposito el bot NUNCA registra un pago
 * por su cuenta):
 * 1. Un padre/tutor envia una foto de una transferencia.
 * 2. El bot la reenvia al administrador del club con una lectura automatica
 *    (solo informativa) y le pide que responda a ESE mensaje.
 * 3. El administrador responde (por ejemplo "si agosto" o "no").
 * 4. Solo entonces el bot crea el Payment real en la plataforma y avisa
 *    tanto al administrador como al remitente.
 *
 * Hoy solo existe un club (Choles Team), pero el diseño ya queda listo para
 * que una futura instalacion multi-club resuelva el club por el numero de
 * telefono/Phone Number ID del webhook en vez de un valor fijo.
 */

const MONTH_NAMES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function resolveClubSlug(): string {
  return process.env.WHATSAPP_CLUB_SLUG || "choles-team";
}

async function resolveClub() {
  return prisma.club.findFirstOrThrow({ where: { slug: resolveClubSlug() } });
}

function resolveAdminPhone(): string {
  const phone = normalizePhone(process.env.WHATSAPP_ADMIN_PHONE);
  if (!phone) throw new Error("Falta WHATSAPP_ADMIN_PHONE en las variables de entorno");
  return phone;
}

/** Si se configura WHATSAPP_ADMIN_EMAIL, se usa para atribuir el pago a ese usuario ADMIN. Es opcional. */
async function resolveAdminUserId(clubId: number): Promise<number | null> {
  const email = process.env.WHATSAPP_ADMIN_EMAIL;
  if (!email) return null;
  const user = await prisma.user.findFirst({
    where: { email, clubId, role: { in: ["ADMIN", "SUPER_ADMIN"] } },
  });
  return user?.id ?? null;
}

/** Arma el contexto del club (categorias, horarios, precio de mensualidad) con datos REALES y actuales de la base de datos. */
async function buildClubContext(clubId: number): Promise<string> {
  const club = await prisma.club.findUniqueOrThrow({ where: { id: clubId } });
  const categories = await prisma.category.findMany({
    where: { clubId, status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
  const concept = await prisma.paymentConcept.findFirst({
    where: { clubId, type: "MENSUALIDAD", active: true },
  });

  const branchLabel = { MASCULINO: "masculino", FEMENINO: "femenino", MIXTO: "mixto" } as const;
  const categoriesText = categories
    .map((c) => {
      const branch = branchLabel[c.branch] ?? c.branch;
      const schedule = c.schedule || "horario por confirmar";
      const court = c.court ? `, cancha ${c.court}` : "";
      return `- ${c.name} (${branch}, ${c.minAge}-${c.maxAge} años): ${schedule}${court}`;
    })
    .join("\n");

  return [
    `Nombre del club: ${club.name}.`,
    'Eslogan: "Juntos, somos Choles Team."',
    concept?.defaultAmount
      ? `Valor de la mensualidad: $${concept.defaultAmount.toLocaleString("es-CO")} por jugador (puede variar en casos de hermanos o becas -- esos casos los revisa el club directamente).`
      : "",
    "Categorias y horarios activos:",
    categoriesText || "(sin categorias activas configuradas todavia)",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Punto de entrada del webhook: procesa un mensaje entrante (texto o imagen). */
export async function handleIncomingWhatsAppMessage(
  message: any,
  contactName: string | undefined
): Promise<void> {
  const club = await resolveClub();
  const adminPhone = resolveAdminPhone();
  const fromPhone = normalizePhone(message.from);
  const isFromAdmin = fromPhone === adminPhone;

  markWhatsAppMessageRead(message.id).catch(() => {});

  if (message.type === "image") {
    await handleIncomingPaymentImage(club.id, fromPhone, contactName, message);
    return;
  }

  if (message.type === "text") {
    const body: string = message.text?.body?.trim() || "";
    const replyToId: string | undefined = message.context?.id;

    // Si el ADMIN responde (swipe-reply) directamente al mensaje donde le
    // reenviamos un comprobante, tratamos su respuesta como confirmacion de
    // pago en vez de como una pregunta general.
    if (isFromAdmin && replyToId) {
      const review = await prisma.whatsAppPaymentReview.findFirst({
        where: { clubId: club.id, adminMessageId: replyToId, status: "PENDING_ADMIN" },
      });
      if (review) {
        await handleAdminPaymentReply(club.id, review, body);
        return;
      }
    }

    if (!body) return;

    const answer = await askClubQuestion(await buildClubContext(club.id), body).catch(() => {
      return "Disculpa, tuve un problema respondiendo tu pregunta. Intenta de nuevo en un momento, o escribe directamente al club.";
    });
    await sendWhatsAppText(fromPhone, answer).catch(() => {});
  }
}

/** Procesa una imagen entrante: intenta identificar al remitente/jugador, la reenvia al admin y crea el registro de revision pendiente. */
async function handleIncomingPaymentImage(
  clubId: number,
  fromPhone: string,
  contactName: string | undefined,
  message: any
): Promise<void> {
  const adminPhone = resolveAdminPhone();
  const mediaId: string = message.image?.id;
  if (!mediaId) return;

  let imagePath: string | null = null;
  let base64 = "";
  let mimeType: string = message.image?.mime_type || "image/jpeg";
  try {
    const downloaded = await downloadWhatsAppMedia(mediaId);
    mimeType = downloaded.mimeType || mimeType;
    base64 = downloaded.buffer.toString("base64");
    const saved = await saveBase64File("whatsapp-payments", `${mediaId}.jpg`, base64);
    imagePath = saved.relativePath;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[WHATSAPP_BOT] Error descargando comprobante", err);
  }

  // Buscar al tutor/padre por su numero de WhatsApp, para sugerir el jugador al administrador.
  const guardians = await prisma.guardian.findMany({ where: { clubId, phone: { not: null } } });
  const guardian = guardians.find((g) => normalizePhone(g.phone) === fromPhone) ?? null;

  let matchedPlayerId: number | null = null;
  let candidateChildren: { id: number; name: string }[] = [];
  if (guardian) {
    const links = await prisma.playerGuardian.findMany({
      where: { guardianId: guardian.id },
      include: { player: { select: { id: true, firstName: true, lastName: true } } },
    });
    candidateChildren = links.map((l) => ({
      id: l.player.id,
      name: `${l.player.firstName} ${l.player.lastName}`,
    }));
    if (candidateChildren.length === 1) matchedPlayerId = candidateChildren[0].id;
  }

  let aiSummary = "";
  if (base64) {
    aiSummary = await describePaymentImage(base64, mimeType).catch(() => "");
  }

  const senderLabel = guardian
    ? `${guardian.firstName} ${guardian.lastName} (tutor registrado)`
    : `${contactName || "un contacto"} (número no registrado en la plataforma)`;
  const playerLine = matchedPlayerId
    ? `Jugador probable: ${candidateChildren[0].name}.`
    : candidateChildren.length > 1
    ? `Tiene varios hijos registrados: ${candidateChildren.map((c) => c.name).join(", ")}. Indica a cual corresponde.`
    : "No se pudo identificar automaticamente al jugador. Indica a cual corresponde.";

  const caption = [
    `📩 Comprobante de pago recibido de ${senderLabel}.`,
    playerLine,
    aiSummary ? `Lectura automatica (informativa, no confirma nada): ${aiSummary}` : "",
    "",
    'Responde a ESTE mensaje con "SI <mes>" (ej. "SI agosto") para registrarlo, o "NO" para rechazarlo. Si hace falta, incluye el nombre del jugador.',
  ]
    .filter(Boolean)
    .join("\n");

  let adminMessageId: string | null = null;
  try {
    adminMessageId = await sendWhatsAppImageByMediaId(adminPhone, mediaId, caption);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[WHATSAPP_BOT] Error reenviando comprobante al admin, se intenta solo con texto", err);
    adminMessageId = await sendWhatsAppText(adminPhone, caption).catch(() => null);
  }

  await prisma.whatsAppPaymentReview.create({
    data: {
      clubId,
      fromPhone,
      guardianId: guardian?.id ?? null,
      playerId: matchedPlayerId,
      mediaId,
      imagePath,
      aiSummary: aiSummary || null,
      adminMessageId,
      status: "PENDING_ADMIN",
    },
  });

  await sendWhatsAppText(
    fromPhone,
    "Recibimos tu comprobante de pago ✅. Lo estamos validando, te avisamos apenas quede registrado en la plataforma."
  ).catch(() => {});
}

/** Procesa la respuesta del administrador a un comprobante pendiente y, si es valido, crea el pago real. */
async function handleAdminPaymentReply(
  clubId: number,
  review: { id: number; guardianId: number | null; playerId: number | null; fromPhone: string },
  replyText: string
): Promise<void> {
  const adminPhone = resolveAdminPhone();

  let candidateChildren: { id: number; name: string }[] = [];
  if (review.guardianId) {
    const links = await prisma.playerGuardian.findMany({
      where: { guardianId: review.guardianId },
      include: { player: { select: { id: true, firstName: true, lastName: true } } },
    });
    candidateChildren = links.map((l) => ({
      id: l.player.id,
      name: `${l.player.firstName} ${l.player.lastName}`,
    }));
  }

  const parsed = await parseAdminPaymentReply(
    replyText,
    new Date().toISOString().slice(0, 10),
    candidateChildren.map((c) => c.name)
  );

  if (!parsed.valid) {
    await prisma.whatsAppPaymentReview.update({
      where: { id: review.id },
      data: { status: "REJECTED", resolvedAt: new Date() },
    });
    await sendWhatsAppText(
      review.fromPhone,
      "No pudimos validar tu comprobante de pago 🙏. Por favor contacta directamente al club para revisarlo."
    ).catch(() => {});
    await sendWhatsAppText(adminPhone, "Entendido, comprobante marcado como no válido.").catch(() => {});
    return;
  }

  let playerId = review.playerId;
  if (!playerId && parsed.playerNameHint && candidateChildren.length > 0) {
    const hint = parsed.playerNameHint.toLowerCase();
    const found = candidateChildren.find(
      (c) => c.name.toLowerCase().includes(hint) || hint.includes(c.name.toLowerCase().split(" ")[0])
    );
    playerId = found?.id ?? null;
  }

  if (!playerId) {
    await sendWhatsAppText(
      adminPhone,
      "No logré identificar a qué jugador corresponde. Por favor responde de nuevo a este mismo mensaje indicando el nombre completo del jugador."
    ).catch(() => {});
    return;
  }

  const now = new Date();
  const month = parsed.month && parsed.month >= 1 && parsed.month <= 12 ? parsed.month : now.getMonth() + 1;
  const year = parsed.year ?? now.getFullYear();
  const periodLabel = `${MONTH_NAMES_ES[month - 1]} ${year}`;

  let concept = await prisma.paymentConcept.findFirst({
    where: { clubId, type: "MENSUALIDAD", active: true },
  });
  if (!concept) {
    concept = await prisma.paymentConcept.create({
      data: { clubId, name: "Mensualidad", type: "MENSUALIDAD", defaultAmount: 80000, active: true },
    });
  }
  const amount = concept.defaultAmount ?? 80000;
  const registeredById = await resolveAdminUserId(clubId);

  const payment = await createPayment(clubId, registeredById, {
    playerId,
    conceptId: concept.id,
    amount,
    status: "PAID",
    method: "TRANSFERENCIA",
    paymentDate: now,
    periodLabel,
  } as any);

  await prisma.whatsAppPaymentReview.update({
    where: { id: review.id },
    data: { status: "CONFIRMED", resolvedAt: now, paymentId: payment.id, playerId },
  });

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { firstName: true, lastName: true },
  });

  await sendWhatsAppText(
    review.fromPhone,
    `✅ Tu pago de ${periodLabel} para ${player?.firstName ?? "tu hijo/a"} fue registrado en la plataforma. ¡Gracias!`
  ).catch(() => {});
  await sendWhatsAppText(
    adminPhone,
    `✅ Registrado: ${player?.firstName ?? ""} ${player?.lastName ?? ""} - ${periodLabel} - $${amount.toLocaleString("es-CO")}.`
  ).catch(() => {});

  // Notificacion dentro de la plataforma para el padre/tutor, si tiene cuenta (mejor esfuerzo, no bloquea el flujo).
  if (review.guardianId) {
    try {
      const guardianWithUser = await prisma.guardian.findUnique({
        where: { id: review.guardianId },
        select: { user: { select: { id: true } } },
      });
      if (guardianWithUser?.user) {
        await prisma.notification.create({
          data: {
            clubId,
            userId: guardianWithUser.user.id,
            title: "Pago registrado",
            body: `Tu pago de ${periodLabel} fue registrado (recibido por WhatsApp).`,
            type: "PAYMENT",
            relatedUrl: "/pagos",
          },
        });
      }
    } catch {
      // no bloquea el flujo si falla la notificacion interna
    }
  }
}
