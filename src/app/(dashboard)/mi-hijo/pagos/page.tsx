"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/DataTable";
import { Badge, statusBadge } from "@/components/Badge";
import { formatDateCO } from "@/lib/date-format";

interface ChildOption {
  id: number;
  firstName: string;
  lastName: string;
}

interface PaymentRow {
  id: number;
  amount: number;
  amountPaid: number;
  effectiveStatus: "PAID" | "PENDING" | "OVERDUE" | "PARTIAL";
  method: string | null;
  dueDate: string | null;
  paymentDate: string | null;
  periodLabel: string | null;
  concept: { id: number; name: string };
  receipt: { id: number } | null;
}

function fmtMoney(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

/**
 * Historial de pagos del hijo, de solo lectura (punto 29 del prompt maestro:
 * el padre puede "ver pagos" y "descargar recibos", nada mas). Antes, el
 * unico link a "detalle y recibos" desde Mi Hijo apuntaba a /pagos — la
 * pantalla de administracion completa del club, con botones de editar/borrar
 * que un padre nunca deberia ver ni usar. Esta pagina cubre esa necesidad
 * real (ver el historial completo, no solo lo pendiente, y bajar recibos)
 * sin exponer ninguna accion de administracion.
 */
export default function MiHijoPagosPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Cargando...</p>}>
      <MiHijoPagosContent />
    </Suspense>
  );
}

function MiHijoPagosContent() {
  const searchParams = useSearchParams();
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/guardians/me/children");
      const data = await res.json();
      const list: ChildOption[] = data.children ?? [];
      setChildren(list);
      const fromQuery = Number(searchParams.get("playerId"));
      const initial = list.find((c) => c.id === fromQuery)?.id ?? list[0]?.id ?? null;
      setSelectedId(initial);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    (async () => {
      const res = await fetch(`/api/payments?playerId=${selectedId}`);
      const data = await res.json();
      setPayments(data.payments ?? []);
      setLoading(false);
    })();
  }, [selectedId]);

  const columns: Column<PaymentRow>[] = [
    { key: "concept", header: "Concepto", render: (p) => p.concept.name, searchValue: (p) => p.concept.name },
    { key: "period", header: "Periodo", render: (p) => p.periodLabel ?? "-" },
    { key: "amount", header: "Valor", render: (p) => fmtMoney(p.amount) },
    {
      key: "amountPaid",
      header: "Valor pagado",
      render: (p) => (p.effectiveStatus === "PARTIAL" ? fmtMoney(p.amountPaid) : "-"),
    },
    { key: "method", header: "Metodo", render: (p) => p.method ?? "-" },
    { key: "due", header: "Vencimiento", render: (p) => (p.dueDate ? formatDateCO(p.dueDate) : "-") },
    {
      key: "status",
      header: "Estado",
      render: (p) => {
        const b = statusBadge("payment", p.effectiveStatus);
        return <Badge tone={b.tone}>{b.label}</Badge>;
      },
    },
    {
      key: "receipt",
      header: "Recibo",
      render: (p) =>
        p.receipt ? (
          <a
            href={`/api/payments/${p.id}/receipt`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs text-turqui-600 hover:underline"
          >
            <Download className="h-3.5 w-3.5" /> Descargar
          </a>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
  ];

  const selectedChild = children.find((c) => c.id === selectedId);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/mi-hijo" className="mb-1 inline-flex items-center gap-1 text-xs text-turqui-600 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a Mi Hijo
        </Link>
        <h1 className="text-xl font-bold text-slate-800">
          Pagos{selectedChild ? ` de ${selectedChild.firstName} ${selectedChild.lastName}` : ""}
        </h1>
        <p className="text-sm text-slate-500">
          Consulta de solo lectura. Para corregir un valor o reportar un pago, contacta al club.
        </p>
      </div>

      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                selectedId === c.id ? "border-turqui-600 bg-turqui-50 text-turqui-700" : "border-slate-200 text-slate-500"
              }`}
            >
              {c.firstName} {c.lastName}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={payments}
          searchPlaceholder="Buscar por concepto..."
          emptyMessage="Todavia no hay pagos registrados."
        />
      )}
    </div>
  );
}
