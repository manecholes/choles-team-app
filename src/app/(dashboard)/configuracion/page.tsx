"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Save, Plus, Building2, ShieldCheck } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";

interface Setting {
  key: string;
  value: string;
}

interface ClubRow {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  _count: { players: number; teams: number; users: number };
}

const emptyClubForm = { name: "", slug: "", primaryColor: "#123852" };
const emptyAdminForm = { clubId: "", email: "", password: "" };

export default function ConfiguracionPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Configuracion del club (ADMIN / SUPER_ADMIN con club) ---
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [savingSetting, setSavingSetting] = useState<string | null>(null);
  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");

  // --- Multi-club (solo SUPER_ADMIN) ---
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [clubForm, setClubForm] = useState(emptyClubForm);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [clubMsg, setClubMsg] = useState<string | null>(null);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const meRes = await fetch("/api/auth/me");
    const me = await meRes.json();
    const userRole: UserRole = me.user.role;
    setRole(userRole);

    if (me.user.clubId) {
      const res = await fetch("/api/settings");
      const data = await res.json();
      const map: Record<string, string> = {};
      for (const s of data.settings ?? []) map[s.key] = s.value;
      setSettings(map);
    }

    if (userRole === "SUPER_ADMIN") {
      const res = await fetch("/api/clubs");
      if (res.ok) setClubs((await res.json()).clubs ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function saveSetting(key: string, value: string) {
    setSavingSetting(key);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setSettings((s) => ({ ...s, [key]: value }));
    setSavingSetting(null);
  }

  async function handleAddCustomSetting(e: FormEvent) {
    e.preventDefault();
    if (!customKey.trim()) return;
    await saveSetting(customKey.trim(), customValue);
    setCustomKey("");
    setCustomValue("");
  }

  async function handleCreateClub(e: FormEvent) {
    e.preventDefault();
    setClubMsg(null);
    const res = await fetch("/api/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clubForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setClubMsg(data.error ?? "No se pudo crear el club");
      return;
    }
    setClubForm(emptyClubForm);
    setClubMsg(`Club "${data.club.name}" creado correctamente.`);
    await loadAll();
  }

  async function handleCreateAdmin(e: FormEvent) {
    e.preventDefault();
    setAdminMsg(null);
    const res = await fetch("/api/clubs/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adminForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setAdminMsg(data.error ?? "No se pudo crear el administrador");
      return;
    }
    setAdminMsg(`Administrador ${data.admin.email} creado. Debera cambiar su contrasena al iniciar sesion.`);
    setAdminForm(emptyAdminForm);
  }

  if (loading || !role) return <p className="text-sm text-slate-400">Cargando...</p>;

  const knownKeys = new Set(["currency", "timezone", "whatsapp_integration_enabled"]);
  const customSettings = Object.entries(settings).filter(([k]) => !knownKeys.has(k));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Configuracion</h1>
        <p className="text-sm text-slate-500">Preferencias del club y, para super administradores, gestion de clubes.</p>
      </div>

      {settings && Object.keys(settings).length >= 0 && role !== "SUPER_ADMIN" && (
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Preferencias del club</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Moneda</label>
              <select
                className="input"
                value={settings.currency ?? "COP"}
                onChange={(e) => saveSetting("currency", e.target.value)}
              >
                <option value="COP">Peso colombiano (COP)</option>
                <option value="USD">Dolar (USD)</option>
                <option value="MXN">Peso mexicano (MXN)</option>
              </select>
            </div>
            <div>
              <label className="label">Zona horaria</label>
              <input
                className="input"
                defaultValue={settings.timezone ?? "America/Bogota"}
                onBlur={(e) => saveSetting("timezone", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Integracion con WhatsApp</label>
              <select
                className="input"
                value={settings.whatsapp_integration_enabled ?? "false"}
                onChange={(e) => saveSetting("whatsapp_integration_enabled", e.target.value)}
              >
                <option value="false">Deshabilitada (proximamente)</option>
                <option value="true">Habilitada</option>
              </select>
            </div>
          </div>
          {savingSetting && <p className="text-xs text-slate-400">Guardando {savingSetting}...</p>}

          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">Otras configuraciones</h3>
            <ul className="mb-3 space-y-1 text-sm">
              {customSettings.map(([k, v]) => (
                <li key={k} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                  <span className="text-slate-600">{k}</span>
                  <span className="text-slate-400">{v}</span>
                </li>
              ))}
              {customSettings.length === 0 && <li className="text-xs text-slate-400">Sin configuraciones adicionales.</li>}
            </ul>
            <form onSubmit={handleAddCustomSetting} className="flex flex-wrap gap-2">
              <input className="input flex-1" placeholder="clave" value={customKey} onChange={(e) => setCustomKey(e.target.value)} />
              <input className="input flex-1" placeholder="valor" value={customValue} onChange={(e) => setCustomValue(e.target.value)} />
              <button type="submit" className="btn-secondary">
                <Plus className="h-4 w-4" /> Agregar
              </button>
            </form>
          </div>
        </div>
      )}

      {role === "SUPER_ADMIN" && (
        <>
          <div className="card">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Building2 className="h-4 w-4" /> Clubes registrados
            </h2>
            <div className="thin-scrollbar overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Slug</th>
                    <th>Jugadores</th>
                    <th>Equipos</th>
                    <th>Usuarios</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {clubs.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td className="text-slate-400">{c.slug}</td>
                      <td>{c._count.players}</td>
                      <td>{c._count.teams}</td>
                      <td>{c._count.users}</td>
                      <td>
                        <Badge tone={c.active ? "green" : "gray"}>{c.active ? "Activo" : "Inactivo"}</Badge>
                      </td>
                    </tr>
                  ))}
                  {clubs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Aun no hay clubes registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Crear nuevo club</h2>
              <form onSubmit={handleCreateClub} className="space-y-3">
                <div>
                  <label className="label">Nombre</label>
                  <input
                    className="input"
                    required
                    value={clubForm.name}
                    onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Slug (identificador unico)</label>
                  <input
                    className="input"
                    required
                    placeholder="mi-club"
                    value={clubForm.slug}
                    onChange={(e) => setClubForm({ ...clubForm, slug: e.target.value.toLowerCase() })}
                  />
                </div>
                <div>
                  <label className="label">Color primario</label>
                  <input
                    type="color"
                    className="h-10 w-20 rounded-lg border border-slate-200"
                    value={clubForm.primaryColor}
                    onChange={(e) => setClubForm({ ...clubForm, primaryColor: e.target.value })}
                  />
                </div>
                {clubMsg && <p className="rounded-lg bg-turqui-50 px-3 py-2 text-sm text-turqui-700">{clubMsg}</p>}
                <button type="submit" className="btn-primary w-full">
                  <Save className="h-4 w-4" /> Crear club
                </button>
              </form>
            </div>

            <div className="card">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ShieldCheck className="h-4 w-4" /> Crear administrador de club
              </h2>
              <form onSubmit={handleCreateAdmin} className="space-y-3">
                <div>
                  <label className="label">Club</label>
                  <select
                    className="input"
                    required
                    value={adminForm.clubId}
                    onChange={(e) => setAdminForm({ ...adminForm, clubId: e.target.value })}
                  >
                    <option value="">Selecciona un club</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Correo</label>
                  <input
                    type="email"
                    className="input"
                    required
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Contrasena temporal</label>
                  <input
                    type="text"
                    className="input"
                    required
                    minLength={8}
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    El administrador debera cambiarla al iniciar sesion por primera vez.
                  </p>
                </div>
                {adminMsg && <p className="rounded-lg bg-turqui-50 px-3 py-2 text-sm text-turqui-700">{adminMsg}</p>}
                <button type="submit" className="btn-primary w-full">
                  Crear administrador
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
