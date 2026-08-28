import "server-only";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { markPaidSchema, paymentConceptSchema, paymentSchema } from "@/server/validators/payment";
import { daysOverdue, effectiveStatus } from "@/server/logic/cartera";

type ConceptInput = z.infer<typeof paymentConceptSchema>;
type PaymentInput = z.infer<typeof paymentSchema>;
type MarkPaidInput = z.infer<typeof markPaidSchema>;

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
    effectiveStatus: effectiveStatus({ status: p.status, dueDate: p.dueDate?.toISOString() ?? null, paymentDate: null, amount: p.amount }),
    daysOverdue: daysOverdue(p.dueDate?.toISOString() ?? null),
  }));
}

export async function createPayment(clubId: number, registeredById: number, data: PaymentInput) {
  await prisma.player.findFirstOrThrow({ where: { id: data.playerId, clubId } });
  const receiptNumber = await nextReceiptNumber(clubId);

  const payment = await prisma.payment.create({
    data: {
      clubId,
      playerId: data.playerId,
      conceptId: data.conceptId,
      amount: data.amount,
      dueDate: data.dueDate || null,
      periodLabel: data.periodLabel || null,
      status: data.status,
      method: data.status === "PAID" ? data.method ?? null : null,
      paymentDate: data.status === "PAID" ? data.paymentDate ?? new Date() : null,
      registeredById,
      receiptNumber,
    },
  });

  if (payment.status === "PAID") {
    await prisma.receipt.create({ data: { paymentId: payment.id, number: receiptNumber } });
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

export async function getPaymentWithDetails(clubId: number, id: number) {
  return prisma.payment.findFirstOrThrow({
    where: { id, clubId },
    include: { player: true, concept: true, club: true, receipt: true },
  });
}

/** Panel de Cartera / Morosidad (punto 13): agrupa deuda por jugador. */
export async function getCartera(
  clubId: number,
  filters: { categoryId?: number; teamId?: number; month?: string; status?: "PENDING" | "OVERDUE" } = {}
) {
  const where: any = { clubId, status: { in: ["PENDING", "OVERDUE"] } };
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
      status: "PENDING" | "OVERDUE";
    }
  >();

  for (const p of payments) {
    const eff = effectiveStatus({ status: p.status, dueDate: p.dueDate?.toISOString() ?? null, paymentDate: null, amount: p.amount });
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
    entry.debt += p.amount;
    entry.monthsPending += 1;
    const overdue = daysOverdue(p.dueDate?.toISOString() ?? null);
    entry.maxDaysOverdue = Math.max(entry.maxDaysOverdue, overdue);
    if (eff === "OVERDUE") entry.status = "OVERDUE";
    byPlayer.set(p.playerId, entry);
  }

  const rows = Array.from(byPlayer.values()).sort((a, b) => b.debt - a.debt);
  const totals = rows.reduce(
    (acc, r) => ({ totalDebt: acc.totalDebt + r.debt, players: acc.players + 1 }),
    { totalDebt: 0, players: 0 }
  );

  return { rows, totals };
}
