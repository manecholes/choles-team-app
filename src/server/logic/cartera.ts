/**
 * Control de morosidad / cartera (punto 13). Modulo puro.
 */

export type PaymentStatus = "PAID" | "PENDING" | "OVERDUE" | "PARTIAL";

export interface PaymentLike {
  status: PaymentStatus;
  dueDate: string | null; // ISO date
  paymentDate: string | null; // ISO date
  amount: number;
  /** Cuanto se ha pagado hasta ahora de este cargo (abonos). 0 si no se ha pagado nada. */
  amountPaid?: number;
}

/**
 * Estado "efectivo" de un pago a una fecha de referencia: un pago PENDING (o
 * PARTIAL, con abono pero sin completar) cuya fecha de vencimiento ya paso
 * se muestra como OVERDUE aunque el campo `status` en base de datos todavia
 * no se haya actualizado (evita depender de un job/cron para que la cartera
 * sea correcta al consultarla).
 */
export function effectiveStatus(payment: PaymentLike, referenceDate: Date = new Date()): PaymentStatus {
  if (payment.status === "PAID") return "PAID";
  if (!payment.dueDate) return payment.status;
  const due = new Date(payment.dueDate);
  if (due.getTime() >= referenceDate.getTime()) return payment.status === "PARTIAL" ? "PARTIAL" : "PENDING";
  return "OVERDUE";
}

export function daysOverdue(dueDate: string | null, referenceDate: Date = new Date()): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const diff = referenceDate.getTime() - due.getTime();
  return diff > 0 ? Math.floor(diff / (24 * 60 * 60 * 1000)) : 0;
}

/** Saldo que todavia se debe de un cargo: el total menos lo abonado hasta ahora (nunca negativo). */
export function outstandingBalance(payment: { amount: number; amountPaid?: number }): number {
  const paid = payment.amountPaid ?? 0;
  return Math.max(0, payment.amount - paid);
}

export interface CarteraSummary {
  totalDebt: number;
  overdueCount: number;
  pendingCount: number;
  partialCount: number;
  paidCount: number;
}

export function summarizeCartera(payments: PaymentLike[], referenceDate: Date = new Date()): CarteraSummary {
  const summary: CarteraSummary = { totalDebt: 0, overdueCount: 0, pendingCount: 0, partialCount: 0, paidCount: 0 };
  for (const p of payments) {
    const status = effectiveStatus(p, referenceDate);
    if (status === "PAID") {
      summary.paidCount++;
      continue;
    }
    summary.totalDebt += outstandingBalance(p);
    if (status === "OVERDUE") summary.overdueCount++;
    else if (status === "PARTIAL") summary.partialCount++;
    else summary.pendingCount++;
  }
  return summary;
}
