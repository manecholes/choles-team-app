"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { Modal } from "@/components/Modal";

/**
 * Genera una contrasena temporal razonable (cumple los requisitos del
 * backend: 8+ caracteres, mayuscula y numero) para que el administrador
 * no tenga que inventarla el mismo.
 */
export function randomPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  let pwd = upper[Math.floor(Math.random() * upper.length)] + digits[Math.floor(Math.random() * digits.length)];
  for (let i = 0; i < 8; i++) pwd += all[Math.floor(Math.random() * all.length)];
  return pwd;
}

/**
 * Modal reutilizable para crear el "acceso" (usuario/contrasena) de un
 * entrenador, delegado o padre/tutor ya registrado en el club. Registrar
 * los datos de contacto de una persona y darle un login para entrar a la
 * app son dos pasos separados a proposito (ver punto 3 del maestro), asi
 * que este modal es el que conecta ambos.
 */
export function CreateAccessModal({
  open,
  onClose,
  title,
  endpoint,
  defaultEmail = "",
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  endpoint: string;
  defaultEmail?: string;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState(defaultEmail);
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
      // El portapapeles no esta disponible en este navegador; el
      // administrador puede seleccionar y copiar el texto manualmente.
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el acceso");
        return;
      }
      setEmail(defaultEmail);
      setPassword("");
      setCopied(false);
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-500">
          Esto crea el correo y la contrasena con los que esta persona va a poder entrar a la aplicacion.
          Se le va a pedir cambiar la contrasena la primera vez que inicie sesion. Copia la contrasena antes de
          guardar y compartela con la persona por un medio seguro (no se vuelve a mostrar despues).
        </p>
        <div>
          <label className="label">Correo electronico</label>
          <input
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
          />
        </div>
        <div>
          <label className="label">Contrasena temporal</label>
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
          {saving ? "Creando..." : "Crear acceso"}
        </button>
      </form>
    </Modal>
  );
}
