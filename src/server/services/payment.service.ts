import "server-only";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { generateMonthlyChargesSchema, markPaidSchema, paymentConceptSchema, paymentSchema } from "@/server/validators/payment";
import { daysOverdue, effectiveStatus, outstandingBalance } from "@/server/logic/cartera";

type ConceptInput = z.infer<typeof paymentConceptSchema>;
type PaymentInput = z.infer<typeof paymentSchema>;
type MarkPaidInput = z.infer<typeof markPaidSchema>;
type GenerateMonthlyChargesInput = z.infer<typeof generateMonthlyChargesSchema>;

/** Deriva amountPaid de forma consistente con el estado elegido, para que nunca queden desincronizados. */
function resolveAmountPaid(status: PaymentInput["status"], amount: number, amountPaid: number | undefined) {
  if (status === "PAID") return amount;
  if (status === "PARTIAL") return Math.min(amount, Math.max(0, amountPaid ?? 0));
  return 0;
}

export async function listPaymentConcepts(clubId: number) {
  return prisma.paymentConcept.findMany({ where: { clubId }, orderBy: { name: "asc" } });
}

export async function createPaymentConcept(clubId: number, data: ConceptInput) {
  return prisma.paymentConcept.create({
    data: { clubId, name: data.name, type: data.type, defaultAmount: data.defaultAmount ?? null, active: data.active },
  });
}

export async function updatePaymentConcept(clubId: number, id: number, data: ConceptInput) {
  await prisma.paymentConcept.findFirstOrThrow({ where: { id, clubId } });
  return prisma.paymentConcept.update({
    where: { id },
    data: { name: data.name, type: data.type, defaultAmount: data.defaultAmount ?? null, active: data.active },
  });
}

async function nextReceiptNumber(clubId: number): Promise<string> {
  const count = await prisma.payment.count({ where: { clubId } });
  return `REC-${String(count + 1).padStart(6, "0")}`;
}

export async function listPayments(
  clubId: number,
  filters: { playerId?: number; categoryId?: number; teamId?: number; status?: string; conceptId?: number } = {}
) {
  const where: any = { clubId };
  if (filters.playerId) where.playerId = filters.playerId;
  if (filters.conceptId) where.conceptId = filters.conceptId;
  if (filters.status) where.status = filters.status;
  if (filters.categoryId || filters.teamId) {
    where.player = {};
    if (filters.categoryId) where.player.categoryId = filters.categoryId;
    if (filters.teamId) where.player.teamPlayers = { some: { teamId: filters.teamId, leftAt: null } };
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      player: { select: { id: true, firstName: true, lastName: true, category: { select: { name: true } } } },
      concept: true,
      receipt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return payments.map((p) => ({
    ...p,
    effectiveStatus: effectiveStatus({ status: p.status, dueDate: p.dueDate?.toISOString() ?? null, paymentDate: null, amount: p.amount, amountPaid: p.amountPaid }),
    daysOverdue: daysOverdue(p.dueDate?.toISOString() ?? null),
  }));
}

export async function createPayment(clubId: number, registeredById: number, data: PaymentInput) {
  await prisma.player.findFirstOrThrow({ where: { id: data.playerId, clubId } });
  const receiptNumber = await nextReceiptNumber(clubId);
  const amountPaid = resolveAmountPaid(data.status, data.amount, data.amountPaid);

  const payment = await prisma.payment.create({
    data: {
      clubId,
      playerId: data.playerId,
      conceptId: data.conceptId,
      amount: data.amount,
      amountPaid,
      dueDate: data.dueDate || null,
      periodLabel: data.periodLabel || null,
      status: data.status,
      method: data.status === "PAID" || data.status === "PARTIAL" ? data.method ?? null : null,
      paymentDate: data.status === "PAID" || data.status === "PARTIAL" ? data.paymentDate ?? new Date() : null,
      registeredById,
      receiptNumber,
    },
  });

  if (payment.status === "PAID") {
    await prisma.receipt.create({ data: { paymentId: payment.id, number: receiptNumber } });
  }

  return payment;
}

/**
 * Edita un cargo ya existente: permite cambiar el valor abonado y el estado
 * (Pendiente / Abono / Pagado), tal como lo pidio el club para no tener que
 * borrar y recrear el pago cada vez que alguien abona o completa su mensualidad.
 */
export async function updatePayment(clubId: number, id: number, registeredById: number, data: PaymentInput) {
  const existing = await prisma.payment.findFirstOrThrow({ where: { id, clubId } });
  const amountPaid = resolveAmountPaid(data.status, data.amount, data.amountPaid);

  const payment = await prisma.payment.update({
    where: { id },
    data: {
      playerId: data.playerId,
      conceptId: data.conceptId,
      amount: data.amount,
      amountPaid,
      dueDate: data.dueDate || null,
      periodLabel: data.periodLabel || null,
      status: data.status,
      method: data.status === "PAID" || data.status === "PARTIAL" ? data.method ?? null : null,
      paymentDate: data.status === "PAID" || data.status === "PARTIAL" ? data.paymentDate ?? existing.paymentDate ?? new Date() : null,
      registeredById,
    },
  });

  if (payment.status === "PAID") {
    const existingReceipt = await prisma.receipt.findUnique({ where: { paymentId: id } });
    if (!existingReceipt) {
      await prisma.receipt.create({ data: { paymentId: id, number: payment.receiptNumber } });
    }
  }

  return payment;
}

export async function markPaymentPaid(clubId: number, id: number, registeredById: number, data: MarkPaidInput) {
  const payment = await prisma.payment.findFirstOrThrow({ where: { id, clubId } });
  if (payment.status === "PAID") return payment;

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: "PAID",
      amountPaid: payment.amount,
      method: data.method,
      paymentDate: data.paymentDate ?? new Date(),
      registeredById,
    },
  });

  const existingReceipt = await prisma.receipt.findUnique({ where: { paymentId: id } });
  if (!existingReceipt) {
    await prisma.receipt.create({ data: { paymentId: id, number: payment.receiptNumber } });
  }

  return updated;
}

export async function deletePayment(clubId: number, id: number) {
  await prisma.payment.findFirstOrThrow({ where: { id, clubId } });
  await prisma.payment.delete({ where: { id } });
}

/**
 * Genera automaticamente el cargo de mensualidad del mes para cada jugador
 * activo que todavia no lo tenga (mismo concepto + mismo periodo), para que
 * el club no tenga que crear un pago por jugador a mano cada mes. El valor
 * y la fecha de vencimiento salen del concepto "Mensualidad" (se crea con
 * el valor por defecto del club si todavia no existe). Es seguro llamarla
 * varias veces en el mismo mes: nunca duplica un cargo ya generado.
 */
export async function generateMonthlyCharges(
  clubId: number,
  registeredById: number,
  data: GenerateMonthlyChargesInput = {},
  defaultMensualidadAmount = 80000
) {
  const now = new Date();
  const [year, monthIdx] = data.month
    ? data.month.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];
  const monthDate = new Date(Date.UTC(year, monthIdx - 1, 1));
  const periodLabel = monthDate.toLocaleDateString("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
  const dueDate = new Date(Date.UTC(year, monthIdx - 1, 5));

  let concept = await prisma.paymentConcept.findFirst({ where: { clubId, type: "MENSUALIDAD", active: true } });
  if (!concept) {
    concept = await prisma.paymentConcept.create({
      data: { clubId, name: "Mensualidad", type: "MENSUALIDAD", defaultAmount: defaultMensualidadAmount, active: true },
    });
  }
  const amount = concept.defaultAmount ?? defaultMensualidadAmount;

  const activePlayers = await prisma.player.findMany({ where: { clubId, status: "ACTIVE" }, select: { id: true } });
  const existing = await prisma.payment.findMany({
    where: { clubId, conceptId: concept.id, periodLabel, playerId: { in: activePlayers.map((p) => p.id) } },
    select: { playerId: true },
  });
  const alreadyCharged = new Set(existing.map((p) => p.playerId));
  const toCreate = activePlayers.filter((p) => !alreadyCharged.has(p.id));

  if (toCreate.length === 0) {
    return { created: 0, periodLabel, concept };
  }

  const count = await prisma.payment.count({ where: { clubId } });
  const payments = toCreate.map((p, i) => ({
    clubId,
    playerId: p.id,
    conceptId: concept!.id,
    amount,
    amountPaid: 0,
    dueDate,
    periodLabel,
    status: "PENDING" as const,
    registeredById,
    receiptNumber: `REC-${String(count + i + 1).padStart(6, "0")}`,
  }));

  await prisma.payment.createMany({ data: payments });

  return { created: payments.length, periodLabel, concept };
}

export async function getPaymentWithDetails(clubId: number, id: number) {
  return prisma.payment.findFirstOrThrow({
    where: { id, clubId },
    include: { player: true, concept: true, club: true, receipt: true },
  });
}

/** Panel de Cartera / Morosidad (punto 13): agrupa deuda por jugador. */
export async function getCartera(
  clubId: number,
  filters: { categoryId?: number; teamId?: number; month?: string; status?: "PENDING" | "OVERDUE" | "PARTIAL" } = {}
) {
  const where: any = { clubId, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } };
  if (filters.month) where.periodLabel = filters.month;
  if (filters.categoryId || filters.teamId) {
    where.player = {};
    if (filters.categoryId) where.player.categoryId = filters.categoryId;
    if (filters.teamId) where.player.teamPlayers = { some: { teamId: filters.teamId, leftAt: null } };
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          category: { select: { name: true } },
          teamPlayers: { where: { leftAt: null }, take: 1, include: { team: { select: { name: true } } } },
        },
      },
      concept: { select: { name: true } },
    },
  });

  const lastPaidByPlayer = await prisma.payment.groupBy({
    by: ["playerId"],
    where: { clubId, status: "PAID" },
    _max: { paymentDate: true },
  });
  const lastPaidMap = new Map(lastPaidByPlayer.map((p) => [p.playerId, p._max.paymentDate]));

  const byPlayer = new Map<
    number,
    {
      playerId: number;
      playerName: string;
      category: string;
      team: string;
      debt: number;
      monthsPending: number;
      lastPayment: Date | null;
      maxDaysOverdue: number;
      status: "PENDING" | "OVERDUE" | "PARTIAL";
    }
  >();

  for (const p of payments) {
    const eff = effectiveStatus({ status: p.status, dueDate: p.dueDate?.toISOString() ?? null, paymentDate: null, amount: p.amount, amountPaid: p.amountPaid });
    if (filters.status && eff !== filters.status) continue;

    const entry = byPlayer.get(p.playerId) ?? {
      playerId: p.playerId,
      playerName: `${p.player.firstName} ${p.player.lastName}`,
      category: p.player.category?.name ?? "-",
      team: p.player.teamPlayers[0]?.team.name ?? "-",
      debt: 0,
      monthsPending: 0,
      lastPayment: lastPaidMap.get(p.playerId) ?? null,
      maxDaysOverdue: 0,
      status: "PENDING" as const,
    };
    entry.debt += outstandingBalance(p);
    entry.monthsPending += 1;
    const overdue = daysOverdue(p.dueDate?.toISOString() ?? null);
    entry.maxDaysOverdue = Math.max(entry.maxDaysOverdue, overdue);
    // Prioridad para el estado general del jugador: Vencido > Abono > Pendiente.
    if (eff === "OVERDUE") entry.status = "OVERDUE";
    else if (eff === "PARTIAL" && entry.status !== "OVERDUE") entry.status = "PARTIAL";
    byPlayer.set(p.playerId, entry);
  }

  const rows = Array.from(byPlayer.values()).sort((a, b) => b.debt - a.debt);
  const totals = rows.reduce(
    (acc, r) => ({ totalDebt: acc.totalDebt + r.debt, players: acc.players + 1 }),
    { totalDebt: 0, players: 0 }
  );

  return { rows, totals };
}
