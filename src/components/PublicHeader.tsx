"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/mision-vision", label: "Mision y Vision" },
  { href: "/galeria", label: "Galeria" },
  { href: "/eventos", label: "Eventos" },
  { href: "/tienda", label: "Tienda" },
  { href: "/contacto", label: "Contactenos" },
];

/**
 * Header publico compartido por todas las paginas del sitio de la escuela
 * (Inicio, Mision y Vision, Galeria, Eventos, Tienda, Contactenos). Todo el
 * sitio es publico sin sesion; "Iniciar sesion" lleva a /login, que solo
 * deja entrar a quien ya tiene usuario y contrasena creados por el club
 * (no es un registro abierto).
 */
export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 bg-turqui-700 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-bold text-lg tracking-wide" onClick={() => setOpen(false)}>
          Choles Team
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "text-white" : "text-turqui-100 hover:text-white"}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <Link href="/login" className="btn-secondary">
            Iniciar sesion
          </Link>
        </div>

        <button
          className="text-white md:hidden"
          aria-label={open ? "Cerrar menu" : "Abrir menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-turqui-700 px-6 pb-4 md:hidden">
          <nav className="flex flex-col gap-3 pt-3 text-sm font-medium">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={active ? "text-white" : "text-turqui-100 hover:text-white"}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link href="/login" className="btn-secondary mt-1 justify-center" onClick={() => setOpen(false)}>
              Iniciar sesion
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
