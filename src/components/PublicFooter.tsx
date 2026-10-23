import Link from "next/link";
import { LogoCrest } from "@/components/PublicHeader";
import { buildMailtoLink, buildWhatsAppLinkTo, CLUB_EMAIL, CLUB_WHATSAPP_NUMBERS, prettyPhone } from "@/lib/site-contact";

const LINKS = [
  { href: "/mision-vision", label: "Misión y visión" },
  { href: "/galeria", label: "Galería" },
  { href: "/eventos", label: "Eventos" },
  { href: "/tienda", label: "Tienda" },
  { href: "/contacto", label: "Contáctenos" },
  { href: "/privacidad", label: "Política de privacidad" },
];

export function PublicFooter() {
  return (
    <footer className="bg-[#0A1433] text-[#C9D3EC]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-start justify-between gap-8 px-6 pb-8 pt-12">
        <div className="min-w-0 flex-[1_1_260px]">
          <LogoCrest className="h-16" alt="Choles Team" />
          <p className="mt-3.5 font-['Barlow_Condensed',ui-sans-serif,sans-serif] text-xl font-bold tracking-[0.04em] text-white">
            &ldquo;Juntos, somos Choles Team.&rdquo;
          </p>
        </div>
        <nav aria-label="Pie de página" className="flex min-w-0 flex-[1_1_280px] flex-wrap gap-x-7 gap-y-2.5 text-base">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-[#C9D3EC] underline-offset-4 hover:text-white hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 flex-[1_1_240px] text-base leading-[1.8]">
          {CLUB_WHATSAPP_NUMBERS.map((n) => (
            <span key={n}>
              <a href={buildWhatsAppLinkTo(n)} target="_blank" rel="noopener noreferrer" className="text-white underline-offset-4 hover:underline">
                WhatsApp: {prettyPhone(n)}
              </a>
              <br />
            </span>
          ))}
          <a href={buildMailtoLink()} className="text-white underline-offset-4 hover:underline">
            {CLUB_EMAIL}
          </a>
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] border-t border-white/10 px-6 pb-7 pt-4 text-sm text-[#AEBBDD]">
        © {new Date().getFullYear()} Choles Team · Escuela y club de baloncesto
      </div>
    </footer>
  );
}
