"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Download, CheckCircle2, Trash2, Settings } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge, statusBadge } from "@/components/Badge";
import { formatDateCO } from "@/lib/date-format";

interface Concept {
  id: number;
  name: string;
  type: string;
  defaultAmount: number | null;
  active: boolean;
}

interface PaymentRow {
  id: number;
  amount: number;
  status: "PAID" | "PENDING" | "OVERDUE";
  effectiveStatus: "PAID" | "PENDING" | "OVERDUE";
  method: string | null;
  dueDate: string | null;
  paymentDate: string | null;
  periodLabel: string | null;
  receiptNumber: string;
  daysOverdue: number;
  player: { id: number; firstName: string; lastName: string };
  concept: { id: number; name: string };
  receipt: { id: number } | null;
}

function fmtMoney(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

const emptyForm = {
  playerId: "" as string | number,
  conceptId: "" as string | number,
  amount: "",
  dueDate: "",
  periodLabel: "",
  status: "PENDING" as "PAID" | "PENDING",
  method: "EFECTIVO" as string,
  paymentDate: "",
};

const emptyConceptForm = { name: "", type: "MENSUALIDAD", defaultAmount: "", active: true };

export default function PagosPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [players, setPlayers] = useState<Array<{ id: number; firstName: string; lastName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [conceptsModalOpen, setConceptsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [conceptForm, setConceptForm] = useState(emptyConceptForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const [payRes, conceptRes, playerRes] = await Promise.all([
      fetch("/api/payments"),
      fetch("/api/payment-concepts"),
      fetch("/api/players"),
    ]);
    setPayments((await payRes.json()).payments ?? []);
    setConcepts((await conceptRes.json()).concepts ?? []);
    setPlayers((await playerRes.json()).players ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function handleConceptChange(conceptId: string) {
    const concept = concepts.find((c) => String(c.id) === conceptId);
    setForm({ ...form, conceptId, amount: concept?.defaultAmount ? String(concept.defaultAmount) : form.amount });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dueDate: form.dueDate || null,
          method: form.status === "PAID" ? form.method : null,
          paymentDate: form.status === "PAID" ? form.paymentDate || new Date().toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo registrar el pago");
        return;
      }
      setModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid(p: PaymentRow) {
    const method = prompt("Metodo de pago (EFECTIVO, TRANSFERENCIA, NEQUI, DAVIPLATA, BANCOLOMBIA):", "EFECTIVO");
    if (!method) return;
    const res = await fetch(`/api/payments/${p.id}/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "No se pudo registrar el pago");
      return;
    }
    await loadData();
  }

  async function handleDelete(p: PaymentRow) {
    if (!confirm("¿Eliminar este registro de pago?")) return;
    await fetch(`/api/payments/${p.id}`, { method: "DELETE" });
    await loadData();
  }

  async function handleCreateConcept(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/payment-concepts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...conceptForm, defaultAmount: conceptForm.defaultAmount || null }),
    });
    setConceptForm(emptyConceptForm);
    await loadData();
  }

  const columns: Column<PaymentRow>[] = [
    {
      key: "player",
      header: "Jugador",
      render: (p) => `${p.player.firstName} ${p.player.lastName}`,
      searchValue: (p) => `${p.player.firstName} ${p.player.lastName}`,
    },
    { key: "concept", header: "Concepto", render: (p) => p.concept.name },
    { key: "period", header: "Periodo", render: (p) => p.periodLabel ?? "-" },
    { key: "amount", header: "Valor", render: (p) => fmtMoney(p.amount) },
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
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex gap-2">
          {p.effectiveStatus !== "PAID" && (
            <button className="btn-secondary" onClick={() => handleMarkPaid(p)} title="Marcar como pagado">
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
          {p.receipt && (
            <a href={`/api/payments/${p.id}/receipt`} target="_blank" className="btn-ghost" title="Descargar recibo">
              <Download className="h-4 w-4" />
            </a>
          )}
          <button className="btn-ghost text-choles-red" onClick={() => handleDelete(p)}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Pagos</h1>
          <p className="text-sm text-slate-500">Registra matriculas, mensualidades, uniformes y demas conceptos.</p>
        </div>
        <button className="btn-secondary" onClick={() => setConceptsModalOpen(true)}>
          <Settings className="h-4 w-4" /> Conceptos
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={payments}
          searchPlaceholder="Buscar por jugador..."
          actions={
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Registrar pago
            </button>
          }
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar pago">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Jugador</label>
            <select className="input" required value={form.playerId} onChange={(e) => setForm({ ...form, playerId: e.target.value })}>
              <option value="">Selecciona un jugador</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Concepto</label>
            <select className="input" required value={form.conceptId} onChange={(e) => handleConceptChange(e.target.value)}>
              <option value="">Selecciona un concepto</option>
              {concepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor</label>
              <input type="number" required className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="label">Periodo (opcional)</label>
              <input className="input" placeholder="2026-08" value={form.periodLabel} onChange={(e) => setForm({ ...form, periodLabel: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Fecha de vencimiento</label>
            <input type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
              <option value="PENDING">Pendiente</option>
              <option value="PAID">Pagado ahora</option>
            </select>
          </div>
          {form.status === "PAID" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Metodo de pago</label>
                <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="NEQUI">Nequi</option>
                  <option value="DAVIPLATA">Daviplata</option>
                  <option value="BANCOLOMBIA">Bancolombia</option>
                </select>
              </div>
              <div>
                <label className="label">Fecha de pago</label>
                <input type="date" className="input" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
              </div>
            </div>
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Guardando..." : "Registrar pago"}
          </button>
        </form>
      </Modal>

      <Modal open={conceptsModalOpen} onClose={() => setConceptsModalOpen(false)} title="Conceptos de pago">
        <div className="space-y-4">
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {concepts.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-sm">
                <span>{c.name}</span>
                <span className="text-slate-400">{c.defaultAmount ? fmtMoney(c.defaultAmount) : "-"}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={handleCreateConcept} className="space-y-3 border-t border-slate-100 pt-4">
            <div>
              <label className="label">Nombre</label>
              <input className="input" required value={conceptForm.name} onChange={(e) => setConceptForm({ ...conceptForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={conceptForm.type} onChange={(e) => setConceptForm({ ...conceptForm, type: e.target.value })}>
                  <option value="MATRICULA">Matricula</option>
                  <option value="MENSUALIDAD">Mensualidad</option>
                  <option value="INSCRIPCION">Inscripcion</option>
                  <option value="UNIFORME">Uniforme</option>
                  <option value="TORNEO">Torneo</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <label className="label">Valor sugerido</label>
                <input type="number" className="input" value={conceptForm.defaultAmount} onChange={(e) => setConceptForm({ ...conceptForm, defaultAmount: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full">
              Agregar concepto
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
