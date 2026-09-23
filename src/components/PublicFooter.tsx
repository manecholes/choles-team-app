import Link from "next/link";
import { buildMailtoLink, buildWhatsAppLink, CLUB_EMAIL } from "@/lib/site-contact";

export function PublicFooter() {
  return (
    <footer className="bg-turqui-800 text-turqui-100">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm md:flex-row">
        <p>Choles Team -- &quot;Juntos, somos Choles Team.&quot;</p>
        <div className="flex flex-wrap justify-center gap-5">
          <Link href="/contacto" className="underline hover:text-white">
            Contactenos
          </Link>
          <Link href="/privacidad" className="underline hover:text-white">
            Politica de privacidad
          </Link>
          <a href={buildWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
            WhatsApp
          </a>
          <a href={buildMailtoLink()} className="underline hover:text-white">
            {CLUB_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
