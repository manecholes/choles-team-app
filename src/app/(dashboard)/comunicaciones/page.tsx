"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Send, Users, Mail, MailOpen } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { can } from "@/lib/permissions";
import { DataTable, type Column } from "@/components/DataTable";
import { Badge } from "@/components/Badge";

const AUDIENCE_LABEL: Record<string, string> = {
  ALL: "Todos",
  CATEGORY: "Categoria",
  TEAM: "Equipo",
  GUARDIANS: "Padres",
  PLAYERS: "Jugadores",
  COACHES: "Entrenadores",
};

interface SentMessage {
  id: number;
  title: string;
  body: string;
  audienceType: string;
  createdAt: string;
  recipientCount: number;
  readCount: number;
  category: { name: string } | null;
  team: { name: string } | null;
  createdBy: { email: string };
}

interface InboxItem {
  recipientId: number;
  readAt: string | null;
  message: { id: number; title: string; body: string; createdAt: string; audienceType: string };
}

const emptyForm = {
  title: "",
  body: "",
  audienceType: "ALL",
  categoryId: "",
  teamId: "",
};

export default function ComunicacionesPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const [sent, setSent] = useState<SentMessage[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canWrite = role ? can(role, "communications:write") : false;

  async function loadAll() {
    setLoading(true);
    const meRes = await fetch("/api/auth/me");
    const me = await meRes.json();
    const userRole: UserRole = me.user.role;
    setRole(userRole);

    if (can(userRole, "communications:write")) {
      const [msgRes, catRes, teamRes] = await Promise.all([
        fetch("/api/communications"),
        fetch("/api/categories"),
        fetch("/api/teams"),
      ]);
      setSent((await msgRes.json()).messages ?? []);
      setCategories((await catRes.json()).categories ?? []);
      setTeams((await teamRes.json()).teams ?? []);
    } else {
      const inboxRes = await fetch("/api/communications/inbox");
      setInbox((await inboxRes.json()).inbox ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          categoryId: form.audienceType === "CATEGORY" ? form.categoryId : null,
          teamId: form.audienceType === "TEAM" ? form.teamId : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo enviar el comunicado");
        return;
      }
      setForm(emptyForm);
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function openInboxItem(item: InboxItem) {
    if (!item.readAt) {
      await fetch(`/api/communications/inbox/${item.message.id}/read`, { method: "POST" });
      setInbox((prev) =>
        prev.map((i) => (i.recipientId === item.recipientId ? { ...i, readAt: new Date().toISOString() } : i))
      );
    }
  }

  if (loading || !role) {
    return <p className="text-sm text-slate-400">Cargando...</p>;
  }

  const columns: Column<SentMessage>[] = [
    { key: "title", header: "Titulo", render: (m) => m.title, searchValue: (m) => m.title },
    {
      key: "audience",
      header: "Destinatarios",
      render: (m) => (
        <span>
          {AUDIENCE_LABEL[m.audienceType]}
          {m.category ? ` - ${m.category.name}` : ""}
          {m.team ? ` - ${m.team.name}` : ""}
        </span>
      ),
    },
    { key: "date", header: "Fecha", render: (m) => new Date(m.createdAt).toLocaleString("es-CO") },
    {
      key: "reach",
      header: "Alcance",
      render: (m) => (
        <span>
          {m.readCount} / {m.recipientCount} leidos
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Comunicaciones</h1>
        <p className="text-sm text-slate-500">
          {canWrite
            ? "Envia comunicados, avisos y recordatorios al club."
            : "Consulta los comunicados y avisos enviados por el club."}
        </p>
      </div>

      {canWrite ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card lg:col-span-1">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Send className="h-4 w-4" /> Nuevo comunicado
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Titulo</label>
                <input
                  className="input"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Mensaje</label>
                <textarea
                  className="input min-h-[100px]"
                  required
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Destinatarios</label>
                <select
                  className="input"
                  value={form.audienceType}
                  onChange={(e) => setForm({ ...form, audienceType: e.target.value })}
                >
                  <option value="ALL">Todos</option>
                  <option value="CATEGORY">Categoria</option>
                  <option value="TEAM">Equipo</option>
                  <option value="GUARDIANS">Padres</option>
                  <option value="PLAYERS">Jugadores</option>
                  <option value="COACHES">Entrenadores</option>
                </select>
              </div>
              {form.audienceType === "CATEGORY" && (
                <div>
                  <label className="label">Categoria</label>
                  <select
                    className="input"
                    required
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  >
                    <option value="">Selecciona una categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {form.audienceType === "TEAM" && (
                <div>
                  <label className="label">Equipo</label>
                  <select
                    className="input"
                    required
                    value={form.teamId}
                    onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                  >
                    <option value="">Selecciona un equipo</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={saving} className="btn-primary w-full">
                <Users className="h-4 w-4" /> {saving ? "Enviando..." : "Enviar comunicado"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <DataTable columns={columns} rows={sent} searchPlaceholder="Buscar comunicado..." emptyMessage="Aun no se han enviado comunicados." />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {inbox.length === 0 && <p className="card text-sm text-slate-400">No tienes comunicados por el momento.</p>}
          {inbox.map((item) => (
            <button
              key={item.recipientId}
              onClick={() => openInboxItem(item)}
              className="card block w-full text-left transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {item.readAt ? (
                    <MailOpen className="mt-0.5 h-5 w-5 text-slate-300" />
                  ) : (
                    <Mail className="mt-0.5 h-5 w-5 text-turqui-600" />
                  )}
                  <div>
                    <p className={`font-semibold ${item.readAt ? "text-slate-600" : "text-slate-800"}`}>
                      {item.message.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{item.message.body}</p>
                  </div>
                </div>
                {!item.readAt && <Badge tone="green">Nuevo</Badge>}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {new Date(item.message.createdAt).toLocaleString("es-CO")}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
