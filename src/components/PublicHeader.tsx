"use client";

/* eslint-disable @next/next/no-img-element, @next/next/no-page-custom-font */
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/mision-vision", label: "Misión y visión" },
  { href: "/galeria", label: "Galería" },
  { href: "/eventos", label: "Eventos" },
  { href: "/tienda", label: "Tienda" },
  { href: "/contacto", label: "Contáctenos" },
];

const COND = "font-['Barlow_Condensed',ui-sans-serif,sans-serif]";

/**
 * Escudo del club. El archivo subido (public/landing/logo.png.jpeg) es la
 * imagen original con fondo gris claro y mucho margen, asi que aqui se
 * recorta solo el escudo y se muestra sobre una placa del mismo gris, para
 * que se vea limpio encima del azul. `className` define la altura (ej. "h-14").
 */
export function LogoCrest({ className = "h-14", alt = "Escudo de Choles Team" }: { className?: string; alt?: string }) {
  return (
    <span className={`inline-block rounded-lg bg-[#F7F7F7] p-1 ${className}`}>
      <span className="relative block h-full overflow-hidden" style={{ aspectRatio: "767 / 620" }}>
        <img
          src="/landing/logo.png.jpeg"
          alt={alt}
          className="absolute max-w-none"
          style={{ width: "133.5%", left: "-16.69%", top: "-65.16%" }}
        />
      </span>
    </span>
  );
}

/**
 * Header publico compartido por todas las paginas del sitio de la escuela
 * (Inicio, Mision y Vision, Galeria, Eventos, Tienda, Contactenos). Todo el
 * sitio es publico sin sesion; "Iniciar sesion" lleva a /login, que solo
 * deja entrar a quien ya tiene usuario y contrasena creados por el club
 * (no es un registro abierto).
 *
 * Tambien carga las fuentes del sitio publico (Barlow y Barlow Condensed),
 * asi todas las paginas publicas comparten la misma apariencia.
 */
export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 bg-[#0E1B45] text-white">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700&display=swap"
      />
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center" onClick={() => setOpen(false)} aria-label="Choles Team, inicio">
          <LogoCrest className="h-12 md:h-14" />
        </Link>

        <nav aria-label="Principal" className={`${COND} hidden items-center gap-6 text-[17px] font-semibold uppercase tracking-[0.06em] lg:flex`}>
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "border-b-2 border-[#D62828] py-2.5 text-white"
                    : "border-b-2 border-transparent py-2.5 text-[#C9D3EC] hover:text-white"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block">
          <Link
            href="/login"
            className={`${COND} inline-flex min-h-[44px] items-center rounded-md border-2 border-white px-5 text-[17px] font-bold uppercase tracking-[0.06em] text-white hover:bg-white/10`}
          >
            Iniciar sesión
          </Link>
        </div>

        <button
          className="inline-flex h-11 w-11 items-center justify-center text-white lg:hidden"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#0E1B45] px-6 pb-5 lg:hidden">
          <nav aria-label="Principal" className={`${COND} flex flex-col gap-1 pt-3 text-lg font-semibold uppercase tracking-[0.06em]`}>
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`py-2.5 ${active ? "text-white" : "text-[#C9D3EC] hover:text-white"}`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex min-h-[48px] items-center justify-center rounded-md bg-[#D62828] font-bold text-white hover:bg-[#A61E1E]"
            >
              Iniciar sesión
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
