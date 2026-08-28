"use client";

import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { MobileSidebar } from "@/components/MobileSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import type { UserRole } from "@prisma/client";

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Administrador",
  ADMIN: "Administrador",
  COACH: "Entrenador",
  DELEGATE: "Delegado",
  GUARDIAN: "Padre / Tutor",
  PLAYER: "Jugador",
};

export function Topbar({
  email,
  role,
  clubName,
}: {
  email: string;
  role: UserRole;
  clubName?: string | null;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {clubName ?? "Choles Team"}
            </p>
            <p className="text-xs text-slate-400">{ROLE_LABELS[role]}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:inline">{email}</span>
          <NotificationBell />
          <button
            onClick={handleLogout}
            className="btn-ghost"
            title="Cerrar sesion"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} role={role} />
    </>
  );
}
