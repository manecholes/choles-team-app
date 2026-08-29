"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { Badge, statusBadge } from "@/components/Badge";
import { Modal } from "@/components/Modal";

interface RosterEntry {
  id: number; // id del vinculo team_player
  jerseyNumber: number | null;
  position: string | null;
  player: {
    id: number;
    firstName: string;
    lastName: string;
    status: "ACTIVE" | "INACTIVE" | "INJURED" | "SUSPENDED";
  };
}

interface AvailablePlayer {
  id: number;
  firstName: string;
  lastName: string;
}

export function TeamRoster({ teamId, initialRoster }: { teamId: number; initialRoster: RosterEntry[] }) {
  const [roster, setRoster] = useState<RosterEntry[]>(initialRoster);
  const [players, setPlayers] = useState<AvailablePlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [playerId, setPlayerId] = useState<string | number>("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function openAdd() {
    setError(null);
    setPlayerId("");
    setJerseyNumber("");
    setPosition("");
    setModalOpen(true);
    setLoadingPlayers(true);
    try {
      const res = await fetch("/api/players");
      const data = await res.json();
      const rosterIds = new Set(roster.map((r) => r.player.id));
      setPlayers((data.players ?? []).filter((p: AvailablePlayer) => !rosterIds.has(p.id)));
    } finally {
      setLoadingPlayers(false);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!playerId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          jerseyNumber: jerseyNumber || null,
          position: position || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo vincular al jugador");
        return;
      }
      setRoster((prev) => [...prev, data.teamPlayer]);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(tp: RosterEntry) {
    if (!confirm(`¿Quitar a ${tp.player.firstName} ${tp.player.lastName} de este equipo?`)) return;
    const res = await fetch(`/api/teams/${teamId}/players/${tp.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "No se pudo quitar al jugador");
      return;
    }
    setRoster((prev) => prev.filter((r) => r.id !== tp.id));
  }

  return (
    <div className="card lg:col-span-2">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Plantilla ({roster.length})</h2>
        <button className="btn-primary" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Vincular jugador
        </button>
      </div>
      <div className="thin-scrollbar overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>#</th>
              <th>Jugador</th>
              <th>Posicion</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {roster.map((tp) => {
              const b = statusBadge("player", tp.player.status);
              return (
                <tr key={tp.id}>
                  <td>{tp.jerseyNumber ?? "-"}</td>
                  <td>
                    <Link href={`/jugadores/${tp.player.id}`} className="font-medium text-turqui-700 hover:underline">
                      {tp.player.firstName} {tp.player.lastName}
                    </Link>
                  </td>
                  <td>{tp.position ?? "-"}</td>
                  <td>
                    <Badge tone={b.tone}>{b.label}</Badge>
                  </td>
                  <td>
                    <button className="btn-ghost text-choles-red" title="Quitar del equipo" onClick={() => handleRemove(tp)}>
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {roster.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  Sin jugadores asignados a este equipo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Vincular jugador al equipo">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="label">Jugador</label>
            <select
              className="input"
              required
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              disabled={loadingPlayers}
            >
              <option value="">{loadingPlayers ? "Cargando..." : "Selecciona un jugador"}</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
            {!loadingPlayers && players.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                No hay jugadores disponibles para vincular (todos ya estan en un equipo, o no hay jugadores creados).
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Numero de camiseta</label>
              <input
                type="number"
                min={0}
                max={99}
                className="input"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Posicion</label>
              <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Base, Alero..." />
            </div>
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={saving || !playerId} className="btn-primary w-full">
            {saving ? "Guardando..." : "Vincular"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
