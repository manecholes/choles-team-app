"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Download, CheckCircle2, Trash2, Settings, Pencil, RefreshCw, Search, ArrowLeft, Users, List, MessageCircle } from "lucide-react";
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
  amountPaid: number;
  status: "PAID" | "PENDING" | "OVERDUE" | "PARTIAL";
  effectiveStatus: "PAID" | "PENDING" | "OVERDUE" | "PARTIAL";
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


/* ------------------------------------------------------------------ */
/* Vista "por jugador": meses de mensualidad desde septiembre de 2026  */
/* ------------------------------------------------------------------ */

/** Primer mes que se muestra en la vista por jugador (pedido del club). */
const FIRST_MONTH = { year: 2026, month: 9 };
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

interface MonthSlot {
  key: string; // "2026-09"
  year: number;
  month: number; // 1-12
  label: string; // "Septiembre 2026"
  periodLabel: string; // "septiembre de 2026" (mismo formato que genera el servidor)
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function buildMonths(extraKeys: string[] = []): MonthSlot[] {
  const now = new Date();
  let endKey = monthKey(now.getFullYear(), now.getMonth() + 1);
  for (const k of extraKeys) if (k > endKey) endKey = k;
  const slots: MonthSlot[] = [];
  let y = FIRST_MONTH.year;
  let m = FIRST_MONTH.month;
  while (monthKey(y, m) <= endKey) {
    slots.push({
      key: monthKey(y, m),
      year: y,
      month: m,
      label: `${MONTH_NAMES[m - 1]} ${y}`,
      periodLabel: `${MONTH_NAMES[m - 1].toLowerCase()} de ${y}`,
    });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return slots;
}

/** Mes ("2026-09") al que pertenece un cargo de mensualidad: por la fecha de vencimiento (dia 5) o, si no tiene, por el texto del periodo. */
function paymentMonthKey(p: PaymentRow): string | null {
  if (p.dueDate) return p.dueDate.slice(0, 7);
  const label = (p.periodLabel ?? "").toLowerCase().trim();
  if (/^\d{4}-\d{2}$/.test(label)) return label;
  const match = label.match(/^([a-záéíóúñ]+)\s+de\s+(\d{4})$/);
  if (match) {
    const idx = MONTH_NAMES.findIndex((n) => n.toLowerCase() === match[1]);
    if (idx >= 0) return monthKey(Number(match[2]), idx + 1);
  }
  return null;
}

function balanceOf(p: PaymentRow) {
  if (p.effectiveStatus === "PAID") return 0;
  return Math.max(0, p.amount - (p.amountPaid ?? 0));
}

const MONTH_TONE: Record<string, { box: string; text: string; label: string }> = {
  PAID: { box: "border-green-200 bg-green-50", text: "text-green-700", label: "Pagado" },
  PARTIAL: { box: "border-blue-200 bg-blue-50", text: "text-blue-700", label: "Abono" },
  PENDING: { box: "border-slate-200 bg-slate-50", text: "text-slate-600", label: "Pendiente" },
  OVERDUE: { box: "border-red-200 bg-red-50", text: "text-red-700", label: "Vencido" },
  NONE: { box: "border-dashed border-slate-300 bg-white", text: "text-slate-400", label: "Sin cargo" },
};

const QUICK_METHODS: Array<{ value: string; label: string }> = [
  { value: "NEQUI", label: "Nequi" },
  { value: "DAVIPLATA", label: "Daviplata" },
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
];

interface PlayerLite {
  id: number;
  firstName: string;
  lastName: string;
  status?: string;
  category?: { id: number; name: string } | null;
}

interface WhatsAppResult {
  ok: boolean;
  skipped?: "already_sent" | "not_paid";
  to?: string;
  guardian?: string;
  error?: string;
}

/** Texto del aviso que se muestra despues de guardar un pago PAGADO. */
function whatsappNotice(w: WhatsAppResult | null | undefined): { tone: "ok" | "error"; text: string } | null {
  if (!w || w.skipped === "not_paid") return null;
  if (w.skipped === "already_sent") return { tone: "ok", text: "Pago guardado. El recibo ya se había enviado antes por WhatsApp." };
  if (w.ok) return { tone: "ok", text: `Pago guardado. Recibo enviado por WhatsApp a ${w.guardian && w.guardian !== "familia" ? `${w.guardian} ` : ""}(${w.to}).` };
  return { tone: "error", text: `Pago guardado, pero el recibo NO se pudo enviar por WhatsApp: ${w.error ?? "error desconocido"}` };
}

const emptyForm = {
  playerId: "" as string | number,
  conceptId: "" as string | number,
  amount: "",
  amountPaid: "",
  dueDate: "",
  periodLabel: "",
  status: "PENDING" as "PAID" | "PENDING" | "PARTIAL",
  method: "EFECTIVO" as string,
  paymentDate: "",
};

const emptyConceptForm = { name: "", type: "MENSUALIDAD", defaultAmount: "", active: true };

export default function PagosPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [players, setPlayers] = useState<PlayerLite[]>([]);
  const [view, setView] = useState<"players" | "table">("players");
  const [playerSearch, setPlayerSearch] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [monthModal, setMonthModal] = useState<{ slot: MonthSlot; payment: PaymentRow | null } | null>(null);
  const [mStatus, setMStatus] = useState<"PAID" | "PARTIAL" | "PENDING">("PAID");
  const [mAmount, setMAmount] = useState("");
  const [mPaidNow, setMPaidNow] = useState("");
  const [mMethod, setMMethod] = useState("NEQUI");
  const [mError, setMError] = useState<string | null>(null);
  const [mSaving, setMSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [resending, setResending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [conceptsModalOpen, setConceptsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [conceptForm, setConceptForm] = useState(emptyConceptForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

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

  /** Genera el cargo de mensualidad del mes para todos los jugadores activos que aun no lo tengan (es segura de llamar varias veces). */
  async function generateMonthly(showAlert = false) {
    setGenerating(true);
    try {
      const res = await fetch("/api/payments/generate-monthly", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (showAlert) {
        if (res.ok) alert(data?.created ? `Se generaron ${data.created} mensualidades nuevas.` : "Ya estaban generadas las mensualidades de este mes.");
        else alert(data?.error ?? "No se pudieron generar las mensualidades");
      }
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    (async () => {
      await generateMonthly();
      await loadData();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(p: PaymentRow) {
    setForm({
      playerId: p.player.id,
      conceptId: p.concept.id,
      amount: String(p.amount),
      amountPaid: String(p.amountPaid ?? 0),
      dueDate: p.dueDate ? p.dueDate.slice(0, 10) : "",
      periodLabel: p.periodLabel ?? "",
      status: p.status === "OVERDUE" ? "PENDING" : (p.status as "PAID" | "PENDING" | "PARTIAL"),
      method: p.method ?? "EFECTIVO",
      paymentDate: p.paymentDate ? p.paymentDate.slice(0, 10) : "",
    });
    setEditingId(p.id);
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
      const payingNow = form.status === "PAID" || form.status === "PARTIAL";
      const res = await fetch(editingId ? `/api/payments/${editingId}` : "/api/payments", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amountPaid: form.status === "PARTIAL" ? form.amountPaid || "0" : undefined,
          dueDate: form.dueDate || null,
          method: payingNow ? form.method : null,
          paymentDate: payingNow ? form.paymentDate || new Date().toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el pago");
        return;
      }
      setModalOpen(false);
      setNotice(data?.payment?.status === "PAID" && data?.payment?.id ? whatsappNotice(await sendReceipt(data.payment.id)) : null);
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
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      alert(data?.error ?? "No se pudo registrar el pago");
      return;
    }
    setNotice(whatsappNotice(await sendReceipt(p.id)));
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


  /* ---------------- Vista por jugador ---------------- */

  const mensualidadConcept = concepts.find((c) => c.type === "MENSUALIDAD" && c.active) ?? concepts.find((c) => c.type === "MENSUALIDAD") ?? null;

  /** Cargos de mensualidad agrupados: jugador -> mes ("2026-09") -> cargo. */
  const monthlyByPlayer = new Map<number, Map<string, PaymentRow>>();
  for (const p of payments) {
    if (mensualidadConcept ? p.concept.id !== mensualidadConcept.id : !/mensualidad/i.test(p.concept.name)) continue;
    const key = paymentMonthKey(p);
    if (!key) continue;
    const byMonth = monthlyByPlayer.get(p.player.id) ?? new Map<string, PaymentRow>();
    if (!byMonth.has(key)) byMonth.set(key, p);
    monthlyByPlayer.set(p.player.id, byMonth);
  }

  const allMonthKeys = Array.from(monthlyByPlayer.values()).flatMap((m) => Array.from(m.keys()));
  const months = buildMonths(allMonthKeys);
  const firstKey = months[0]?.key ?? "2026-09";

  function playerSummary(playerId: number) {
    const byMonth = monthlyByPlayer.get(playerId);
    let debt = 0;
    let owedMonths = 0;
    let overdue = false;
    if (byMonth) {
      for (const [key, p] of Array.from(byMonth.entries())) {
        if (key < firstKey) continue;
        const b = balanceOf(p);
        if (b > 0) {
          debt += b;
          owedMonths++;
          if (p.effectiveStatus === "OVERDUE") overdue = true;
        }
      }
    }
    return { debt, owedMonths, overdue };
  }

  const visiblePlayers = players
    .filter((p) => !p.status || p.status === "ACTIVE" || monthlyByPlayer.has(p.id))
    .filter((p) => {
      const q = playerSearch.trim().toLowerCase();
      if (!q) return true;
      return `${p.firstName} ${p.lastName}`.toLowerCase().includes(q);
    })
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "es"));

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ?? null;

  function openMonth(slot: MonthSlot, payment: PaymentRow | null) {
    const status = payment?.effectiveStatus ?? "NONE";
    setMStatus(status === "PARTIAL" ? "PARTIAL" : "PAID");
    setMAmount(String(payment?.amount ?? mensualidadConcept?.defaultAmount ?? ""));
    setMPaidNow("");
    setMMethod(payment?.method && payment.method !== "BANCOLOMBIA" ? payment.method : "NEQUI");
    setMError(null);
    setMonthModal({ slot, payment });
  }

  async function saveMonth(e: FormEvent) {
    e.preventDefault();
    if (!monthModal || !selectedPlayer) return;
    const { slot, payment } = monthModal;
    const amount = Number(mAmount);
    if (!amount || amount <= 0) {
      setMError("Escribe el valor de la mensualidad");
      return;
    }
    if (!mensualidadConcept && !payment) {
      setMError("No existe el concepto Mensualidad. Créalo en el botón Conceptos.");
      return;
    }

    const alreadyPaid = payment?.amountPaid ?? 0;
    let status: "PAID" | "PARTIAL" | "PENDING" = mStatus;
    let amountPaid = 0;
    if (mStatus === "PARTIAL") {
      const now = Number(mPaidNow);
      if (!now || now <= 0) {
        setMError("Escribe cuánto pagó");
        return;
      }
      amountPaid = alreadyPaid + now;
      if (amountPaid >= amount) {
        status = "PAID";
        amountPaid = amount;
      }
    } else if (mStatus === "PAID") {
      amountPaid = amount;
    }

    const isNewPayment = status !== "PENDING" && (mStatus === "PARTIAL" || payment?.effectiveStatus !== "PAID");
    const paymentDate = status === "PENDING" ? null : isNewPayment ? new Date().toISOString() : payment?.paymentDate ?? new Date().toISOString();

    setMSaving(true);
    setMError(null);
    try {
      const body = {
        playerId: selectedPlayer.id,
        conceptId: payment?.concept.id ?? mensualidadConcept!.id,
        amount,
        amountPaid: status === "PARTIAL" ? amountPaid : undefined,
        dueDate: payment?.dueDate ?? `${slot.key}-05`,
        periodLabel: payment?.periodLabel ?? slot.periodLabel,
        status,
        method: status === "PENDING" ? null : mMethod,
        paymentDate,
      };
      const res = await fetch(payment ? `/api/payments/${payment.id}` : "/api/payments", {
        method: payment ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMError(data?.error ?? "No se pudo guardar");
        return;
      }
      setMonthModal(null);
      const savedId: number | undefined = data?.payment?.id;
      if (data?.payment?.status === "PAID" && savedId) {
        setNotice({ tone: "ok", text: "Pago guardado. Enviando recibo por WhatsApp..." });
        setNotice(whatsappNotice(await sendReceipt(savedId)));
      } else {
        setNotice(null);
      }
      await loadData();
    } finally {
      setMSaving(false);
    }
  }

  /** Envia el recibo por WhatsApp de un pago que acaba de quedar PAGADO (el servidor evita enviarlo dos veces). */
  async function sendReceipt(paymentId: number): Promise<WhatsAppResult | null> {
    const res = await fetch(`/api/payments/${paymentId}/receipt`, { method: "POST" });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: data?.error ?? "No se pudo enviar el recibo" };
    return data?.whatsapp ?? null;
  }

  async function resendReceipt(paymentId: number) {
    setResending(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/receipt?force=1`, { method: "POST" });
      const data = await res.json().catch(() => null);
      const w: WhatsAppResult | undefined = data?.whatsapp;
      if (!res.ok || !w) {
        setNotice({ tone: "error", text: data?.error ?? "No se pudo reenviar el recibo" });
      } else if (w.ok) {
        setNotice({ tone: "ok", text: `Recibo reenviado por WhatsApp (${w.to}).` });
      } else {
        setNotice({ tone: "error", text: `No se pudo reenviar el recibo: ${w.error ?? "error desconocido"}` });
      }
      setMonthModal(null);
    } finally {
      setResending(false);
    }
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
    { key: "amountPaid", header: "Valor pagado", render: (p) => (p.effectiveStatus === "PARTIAL" ? fmtMoney(p.amountPaid) : "-") },
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
          <button className="btn-ghost" onClick={() => openEdit(p)} title="Editar pago">
            <Pencil className="h-4 w-4" />
          </button>
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
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => generateMonthly(true)} disabled={generating} title="Genera el cargo de mensualidad del mes para los jugadores activos que aun no lo tengan">
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} /> Generar mensualidades
          </button>
          <button className="btn-secondary" onClick={() => setConceptsModalOpen(true)}>
            <Settings className="h-4 w-4" /> Conceptos
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${notice.tone === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          <span>{notice.text}</span>
          <button className="text-xs underline" onClick={() => setNotice(null)}>
            Cerrar
          </button>
        </div>
      )}

      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
        <button
          className={`flex items-center gap-1 rounded-md px-3 py-1.5 ${view === "players" ? "bg-turqui-700 text-white" : "text-slate-600"}`}
          onClick={() => setView("players")}
        >
          <Users className="h-4 w-4" /> Por jugador
        </button>
        <button
          className={`flex items-center gap-1 rounded-md px-3 py-1.5 ${view === "table" ? "bg-turqui-700 text-white" : "text-slate-600"}`}
          onClick={() => setView("table")}
        >
          <List className="h-4 w-4" /> Todos los movimientos
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : view === "players" ? (
        selectedPlayer ? (
          <div className="space-y-4">
            <button className="btn-ghost" onClick={() => setSelectedPlayerId(null)}>
              <ArrowLeft className="h-4 w-4" /> Volver a la lista
            </button>
            <div className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {selectedPlayer.firstName} {selectedPlayer.lastName}
                  </h2>
                  <p className="text-sm text-slate-500">{selectedPlayer.category?.name ?? ""}</p>
                </div>
                {(() => {
                  const s = playerSummary(selectedPlayer.id);
                  return s.debt > 0 ? (
                    <div className="text-right">
                      <p className={`text-lg font-bold ${s.overdue ? "text-red-600" : "text-slate-700"}`}>{fmtMoney(s.debt)}</p>
                      <p className="text-xs text-slate-500">Debe {s.owedMonths} {s.owedMonths === 1 ? "mes" : "meses"}</p>
                    </div>
                  ) : (
                    <Badge tone="green">Al día</Badge>
                  );
                })()}
              </div>
              <p className="mt-3 text-xs text-slate-400">Toca un mes para registrar el pago.</p>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {months.map((slot) => {
                  const pay = monthlyByPlayer.get(selectedPlayer.id)?.get(slot.key) ?? null;
                  const tone = MONTH_TONE[pay?.effectiveStatus ?? "NONE"];
                  const partialOverdue = pay && pay.effectiveStatus === "OVERDUE" && pay.amountPaid > 0;
                  return (
                    <button
                      key={slot.key}
                      onClick={() => openMonth(slot, pay)}
                      className={`rounded-xl border p-3 text-left transition hover:shadow-md ${tone.box}`}
                    >
                      <p className="text-sm font-semibold text-slate-800">{slot.label}</p>
                      <p className={`mt-1 text-sm font-medium ${tone.text}`}>{partialOverdue ? "Abono · vencido" : tone.label}</p>
                      {pay && (
                        <p className="mt-1 text-xs text-slate-500">
                          {pay.effectiveStatus === "PAID"
                            ? `${fmtMoney(pay.amount)}${pay.method ? ` · ${pay.method.charAt(0)}${pay.method.slice(1).toLowerCase()}` : ""}`
                            : pay.amountPaid > 0
                              ? `Pagó ${fmtMoney(pay.amountPaid)} · debe ${fmtMoney(balanceOf(pay))}`
                              : `Debe ${fmtMoney(pay.amount)}`}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="card space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Buscar jugador..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
              />
            </div>
            <ul className="divide-y divide-slate-100">
              {visiblePlayers.map((pl) => {
                const s = playerSummary(pl.id);
                return (
                  <li key={pl.id}>
                    <button
                      className="flex w-full items-center justify-between gap-3 px-1 py-3 text-left hover:bg-slate-50"
                      onClick={() => setSelectedPlayerId(pl.id)}
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          {pl.firstName} {pl.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{pl.category?.name ?? ""}</p>
                      </div>
                      {s.debt > 0 ? (
                        <div className="text-right">
                          <Badge tone={s.overdue ? "red" : "yellow"}>
                            Debe {s.owedMonths} {s.owedMonths === 1 ? "mes" : "meses"}
                          </Badge>
                          <p className="mt-1 text-xs text-slate-500">{fmtMoney(s.debt)}</p>
                        </div>
                      ) : (
                        <Badge tone="green">Al día</Badge>
                      )}
                    </button>
                  </li>
                );
              })}
              {visiblePlayers.length === 0 && <li className="py-6 text-center text-sm text-slate-400">No hay jugadores con ese nombre.</li>}
            </ul>
          </div>
        )
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

      <Modal
        open={monthModal !== null}
        onClose={() => setMonthModal(null)}
        title={monthModal && selectedPlayer ? `${monthModal.slot.label} · ${selectedPlayer.firstName}` : "Mensualidad"}
      >
        {monthModal && (
          <form onSubmit={saveMonth} className="space-y-4">
            {(() => {
              const pay = monthModal.payment;
              const st = pay?.effectiveStatus ?? "NONE";
              const tone = MONTH_TONE[st];
              return (
                <div className={`rounded-lg border p-3 text-sm ${tone.box}`}>
                  <p>
                    Estado actual: <span className={`font-semibold ${tone.text}`}>{tone.label}</span>
                  </p>
                  {pay && (
                    <p className="mt-1 text-slate-600">
                      Pagado: {fmtMoney(pay.amountPaid ?? 0)} · Saldo: {fmtMoney(balanceOf(pay))}
                      {pay.paymentDate ? ` · Último pago: ${formatDateCO(pay.paymentDate)}` : ""}
                    </p>
                  )}
                  {pay?.receipt && (
                    <a href={`/api/payments/${pay.id}/receipt`} target="_blank" className="mt-2 inline-flex items-center gap-1 text-turqui-700 underline">
                      <Download className="h-4 w-4" /> Descargar recibo
                    </a>
                  )}
                  {pay?.effectiveStatus === "PAID" && (
                    <button
                      type="button"
                      disabled={resending}
                      onClick={() => resendReceipt(pay.id)}
                      className="ml-4 mt-2 inline-flex items-center gap-1 text-green-700 underline"
                    >
                      <MessageCircle className="h-4 w-4" /> {resending ? "Enviando..." : "Reenviar por WhatsApp"}
                    </button>
                  )}
                </div>
              );
            })()}

            <div>
              <label className="label">Valor de la mensualidad</label>
              <input type="number" className="input" value={mAmount} onChange={(e) => setMAmount(e.target.value)} />
              <p className="mt-1 text-xs text-slate-400">Cámbialo solo si es hermano o becado.</p>
            </div>

            <div>
              <label className="label">Estado</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["PAID", "Pagado", "bg-green-600"],
                  ["PARTIAL", "Abono", "bg-blue-600"],
                  ["PENDING", "Pendiente", "bg-slate-500"],
                ] as const).map(([value, label, color]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setMStatus(value)}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium ${mStatus === value ? `${color} border-transparent text-white` : "border-slate-200 bg-white text-slate-700"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {mStatus === "PARTIAL" && (
              <div>
                <label className="label">¿Cuánto pagó hoy?</label>
                <input type="number" className="input" autoFocus value={mPaidNow} onChange={(e) => setMPaidNow(e.target.value)} />
                {(monthModal.payment?.amountPaid ?? 0) > 0 && (
                  <p className="mt-1 text-xs text-slate-400">Se suma a lo que ya había abonado ({fmtMoney(monthModal.payment!.amountPaid)}).</p>
                )}
              </div>
            )}

            {mStatus !== "PENDING" && (
              <div>
                <label className="label">Método de pago</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {QUICK_METHODS.map((m) => (
                    <button
                      type="button"
                      key={m.value}
                      onClick={() => setMMethod(m.value)}
                      className={`rounded-lg border px-2 py-2 text-sm font-medium ${mMethod === m.value ? "border-transparent bg-turqui-700 text-white" : "border-slate-200 bg-white text-slate-700"}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mError}</p>}
            <button type="submit" disabled={mSaving} className="btn-primary w-full">
              {mSaving ? "Guardando..." : "Guardar"}
            </button>
            {mStatus === "PAID" && monthModal.payment?.effectiveStatus !== "PAID" && (
              <p className="text-center text-xs text-slate-400">Al guardar como Pagado se envía el recibo por WhatsApp al acudiente.</p>
            )}
          </form>
        )}
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Editar pago" : "Registrar pago"}>
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
              <option value="PARTIAL">Abono</option>
              <option value="PAID">Pagado</option>
            </select>
          </div>
          {form.status === "PARTIAL" && (
            <div>
              <label className="label">Valor pagado (abono)</label>
              <input
                type="number"
                required
                className="input"
                value={form.amountPaid}
                onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
              />
            </div>
          )}
          {(form.status === "PAID" || form.status === "PARTIAL") && (
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
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Registrar pago"}
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
