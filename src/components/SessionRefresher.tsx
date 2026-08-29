"use client";

import { useEffect } from "react";

/**
 * Refresca la sesion en segundo plano mientras el dashboard esta abierto.
 * El access token dura 15 minutos; este componente llama a
 * /api/auth/refresh cada 10 minutos para rotarlo antes de que expire,
 * usando la cookie httpOnly del refresh token (7 dias). No renderiza nada.
 */
export function SessionRefresher() {
  useEffect(() => {
    const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos

    async function refresh() {
      try {
        await fetch("/api/auth/refresh", { method: "POST" });
      } catch {
        // Si falla, el usuario simplemente tendra que volver a iniciar
        // sesion cuando el access token expire; no interrumpimos la UI.
      }
    }

    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
