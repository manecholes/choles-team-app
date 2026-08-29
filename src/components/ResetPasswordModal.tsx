"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { Modal } from "@/components/Modal";
import { randomPassword } from "@/components/CreateAccessModal";

/**
 * Modal para restablecer la contrasena de alguien que YA tiene acceso a la
 * app (entrenador, delegado o padre/tutor). A diferencia de
 * "CreateAccessModal" (que crea el login por primera vez), aqui no se pide
 * ni se cambia el correo: solo se define una contrasena nueva, que la
 * persona debera cambiar la proxima vez que inicie sesion.
 */
export function ResetPasswordModal({
  open,
  onClose,
  title,
  endpoint,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  endpoint: string;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    setPassword(randomPassword());
    setCopied(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      // El portapapeles no esta disponible; se puede copiar manualmente.
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo restablecer la contrasena");
        return;
      }
      setPassword("");
      setCopied(false);
      onDone();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-500">
          Esto reemplaza la contrasena actual de esta persona (el correo no cambia). Se le va a pedir
          definir una contrasena nueva la proxima vez que inicie sesion. Copia esta contrasena antes de
          guardar y compartela por un medio seguro — no se vuelve a mostrar despues.
        </p>
        <div>
          <label className="label">Contrasena nueva</label>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              required
              minLength={8}
              className="input flex-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="btn-secondary shrink-0" onClick={handleGenerate}>
              <KeyRound className="h-4 w-4" /> Generar
            </button>
            {password && (
              <button type="button" className="btn-secondary shrink-0" onClick={handleCopy}>
                {copied ? "Copiada" : "Copiar"}
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">Minimo 8 caracteres, con una mayuscula y un numero.</p>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? "Guardando..." : "Restablecer contrasena"}
        </button>
      </form>
    </Modal>
  );
}
