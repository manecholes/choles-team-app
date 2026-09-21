import { Mail, MessageCircle } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { buildMailtoLink, buildWhatsAppLink, CLUB_EMAIL } from "@/lib/site-contact";

/** Pagina publica: Contactenos (sin sesion). */
export default function ContactoPage() {
  const whatsappMessage = "Hola, quiero mas informacion sobre Choles Team.";

  return (
    <main className="min-h-screen bg-slate-50">
      <PublicHeader />

      <section className="bg-turqui-700 py-14 text-center text-white">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-turqui-100">Choles Team</p>
          <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Contactenos</h1>
          <p className="mt-3 text-turqui-100">
            Escribenos por WhatsApp o correo -- con gusto te respondemos.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="grid gap-6 sm:grid-cols-2">
          <a
            href={buildWhatsAppLink(whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="card flex flex-col items-center gap-3 text-center transition hover:shadow-md"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
              <MessageCircle className="h-7 w-7" />
            </span>
            <h2 className="font-semibold text-turqui-700">Escribir por WhatsApp</h2>
            <p className="text-sm text-slate-500">Respuesta rapida para inscripciones, horarios y dudas.</p>
            <span className="btn-primary mt-2">Abrir WhatsApp</span>
          </a>

          <a
            href={buildMailtoLink("Informacion sobre Choles Team")}
            className="card flex flex-col items-center gap-3 text-center transition hover:shadow-md"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-turqui-50 text-turqui-600">
              <Mail className="h-7 w-7" />
            </span>
            <h2 className="font-semibold text-turqui-700">Enviar un correo</h2>
            <p className="text-sm text-slate-500">{CLUB_EMAIL}</p>
            <span className="btn-secondary mt-2">Enviar correo</span>
          </a>
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          Si ya eres parte de Choles Team y tienes usuario creado, puedes{" "}
          <a href="/login" className="text-turqui-600 underline">
            iniciar sesion
          </a>{" "}
          para ver la informacion de tu hijo/a.
        </p>
      </section>

      <PublicFooter />
    </main>
  );
}
