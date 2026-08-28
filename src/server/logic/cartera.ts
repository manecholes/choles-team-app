/**
 * Control de morosidad / cartera (punto 13). Modulo puro.
 */

export type PaymentStatus = "PAID" | "PENDING" | "OVERDUE";

export interface PaymentLike {
  status: PaymentStatus;
  dueDate: string | null; // ISO date
  paymentDate: string | null; // ISO date
  amount: number;
}

/**
 * Estado "efectivo" de un pago a una fecha de referencia: un pago PENDING
 * cuya fecha de vencimiento ya paso se muestra como OVERDUE aunque el
 * campo `status` en base de datos todavia no se haya actualizado (evita
 * depender de un job/cron para que la cartera sea correcta al consultarla).
 */
export function effectiveStatus(payment: PaymentLike, referenceDate: Date = new Date()): PaymentStatus {
  if (payment.status === "PAID") return "PAID";
  if (!payment.dueDate) return payment.status;
  const due = new Date(payment.dueDate);
  return due.getTime() < referenceDate.getTime() ? "OVERDUE" : "PENDING";
}

export function daysOverdue(dueDate: string | null, referenceDate: Date = new Date()): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const diff = referenceDate.getTime() - due.getTime();
  return diff > 0 ? Math.floor(diff / (24 * 60 * 60 * 1000)) : 0;
}

export interface CarteraSummary {
  totalDebt: number;
  overdueCount: number;
  pendingCount: number;
  paidCount: number;
}

export function summarizeCartera(payments: PaymentLike[], referenceDate: Date = new Date()): CarteraSummary {
  const summary: CarteraSummary = { totalDebt: 0, overdueCount: 0, pendingCount: 0, paidCount: 0 };
  for (const p of payments) {
    const status = effectiveStatus(p, referenceDate);
    if (status === "PAID") {
      summary.paidCount++;
      continue;
    }
    summary.totalDebt += p.amount;
    if (status === "OVERDUE") summary.overdueCount++;
    else summary.pendingCount++;
  }
  return summary;
}
