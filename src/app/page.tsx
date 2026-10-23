/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LogoCrest, PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { buildMailtoLink, buildWhatsAppLink, CLUB_EMAIL } from "@/lib/site-contact";
import { listPublicClubEvents } from "@/server/services/clubEvent.service";

// Lee la sesion y los proximos eventos en cada visita (no se pre-renderiza en el build).
export const dynamic = "force-dynamic";

/**
 * Landing page publica de Choles Team (cholesteam.com).
 * Si hay sesion valida se envia directo al dashboard.
 *
 * Diseno: foto grande del equipo + franja de proximos eventos (estilo club
 * profesional) + categorias, propuesta del club, galeria y acceso de las
 * familias (estilo academia). Colores del escudo: azul navy, rojo y blanco.
 */

/**
 * Fotos de la pagina de inicio, en public/landing (subidas tal como llegaron
 * por WhatsApp, por eso conservan ese nombre de archivo).
 */
function foto(sufijo: string) {
  return encodeURI(`/landing/WhatsApp Image 2026-10-23 at ${sufijo}.jpeg`);
}

const FOTOS: Record<string, string> = {
  "equipo-grupo-1": foto("9.10.16 AM"),
  "equipo-grupo-2": foto("9.10.15 AM (6)"),
  "minibasket-poster": foto("9.10.16 AM (1)"),
  "sub18-poster": foto("9.10.15 AM (2)"),
  "jugadora-dribla": foto("9.10.16 AM (3)"),
  "cinco-jugadores": foto("9.10.16 AM (2)"),
  "jugador-balon": foto("9.10.15 AM (5)"),
  "jugador-sentado": foto("9.10.15 AM (4)"),
  "tres-cht": foto("9.10.15 AM (1)"),
  "tres-jugadores": foto("9.10.15 AM"),
};

const COND = "font-['Barlow_Condensed',ui-sans-serif,sans-serif]";
const KICKER = `${COND} text-[17px] font-bold uppercase tracking-[0.18em] text-[#C42222]`;
const H2 = `${COND} mt-1.5 text-[clamp(40px,5vw,60px)] font-extrabold uppercase leading-none`;

const INSCRIPCION_MSG = "Hola, quiero inscribir a mi hijo en Choles Team";

const CATEGORIAS = [
  { code: "U8", edad: "Menores de 8 años", img: FOTOS["minibasket-poster"], pos: "center 30%", alt: "Grupo de Minibasket de Choles Team" },
  { code: "U10", edad: "Menores de 10 años", img: FOTOS["jugador-sentado"], pos: "center 30%", alt: "Jugador de Choles Team sentado sobre un balón" },
  { code: "U12", edad: "Menores de 12 años", img: FOTOS["jugador-balon"], pos: "center 32%", alt: "Jugador de Choles Team sosteniendo un balón" },
  { code: "U14", edad: "Menores de 14 años", img: FOTOS["cinco-jugadores"], pos: "center 62%", alt: "Cinco jugadores de Choles Team posando" },
  { code: "U16", edad: "Menores de 16 años", img: FOTOS["tres-jugadores"], pos: "center 38%", alt: "Tres jugadores de Choles Team bajo el aro" },
  { code: "U18", edad: "Menores de 18 años", img: FOTOS["sub18-poster"], pos: "center 22%", alt: "Equipo Sub 18 de Choles Team" },
];

const RAZONES = [
  { n: "01", t: "Formación integral", d: "Fundamentos del baloncesto, disciplina y trabajo en equipo en cada entrenamiento." },
  { n: "02", t: "Torneos y viajes", d: "Competimos dentro y fuera de la ciudad, en torneos regionales y nacionales." },
  { n: "03", t: "Seguimiento del rendimiento", d: "Evaluaciones físicas y control de la carga de entrenamiento para que cada jugador progrese con seguridad." },
  { n: "04", t: "Familias conectadas", d: "Horarios, asistencia, pagos y recibos que llegan directo al WhatsApp del acudiente." },
];

const GALERIA = [
  { src: FOTOS["tres-cht"], alt: "Tres jugadores Sub 18 con uniforme CHT", pos: "center 30%", grow: "basis-[260px] grow" },
  { src: FOTOS["equipo-grupo-2"], alt: "Grupo de jugadores de Choles Team", pos: "center 45%", grow: "basis-[520px] grow-[2]" },
  { src: FOTOS["jugador-balon"], alt: "Jugador de Choles Team sosteniendo un balón", pos: "center 35%", grow: "basis-[260px] grow" },
  { src: FOTOS["tres-jugadores"], alt: "Tres jugadores de Choles Team bajo el aro", pos: "center 40%", grow: "basis-[260px] grow" },
  { src: FOTOS["cinco-jugadores"], alt: "Cinco jugadores de Choles Team posando con balones", pos: "center 60%", grow: "basis-[260px] grow" },
  { src: FOTOS["jugadora-dribla"], alt: "Jugadora de Choles Team con el balón", pos: "center 55%", grow: "basis-[260px] grow" },
];

const FAMILIA_ITEMS = [
  "Próximo entrenamiento y partido",
  "Calendario del equipo",
  "Estado de pagos y recibos",
  "Asistencia",
  "Rendimiento deportivo",
  "Comunicados del club",
];

function Arrow() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function Check() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D62828" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function dayMonth(date: Date) {
  const day = new Intl.DateTimeFormat("es-CO", { day: "numeric", timeZone: "America/Bogota" }).format(date);
  const month = new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "America/Bogota" })
    .format(date)
    .replace(".", "")
    .toUpperCase();
  return { day, month };
}

async function proximosEventos() {
  try {
    const events = await listPublicClubEvents();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return events
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 3);
  } catch {
    // Si la base de datos falla, la pagina de inicio igual debe cargar.
    return [];
  }
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const eventos = await proximosEventos();
  const inscripcion = buildWhatsAppLink(INSCRIPCION_MSG);

  return (
    <main className="min-h-screen bg-white font-['Barlow',ui-sans-serif,system-ui,sans-serif] text-[#0E1B45]">
      <PublicHeader />

      {/* Portada */}
      <section className="relative flex min-h-[620px] items-end overflow-hidden bg-[#0E1B45] md:min-h-[680px]">
        <img
          src={FOTOS["equipo-grupo-1"]}
          alt="Jugadores y jugadoras de Choles Team en la cancha"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "center 40%" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(14,27,69,0) 30%, rgba(14,27,69,0.92) 80%)" }}
        />
        <div className="relative mx-auto w-full max-w-[1200px] px-6 pb-16 text-white">
          <p className={`${COND} mb-3 text-lg font-bold uppercase tracking-[0.18em]`}>Escuela y club de baloncesto</p>
          <h1 className={`${COND} text-[clamp(52px,8vw,112px)] font-extrabold uppercase leading-[0.92]`}>
            Juntos, somos
            <br />
            <span className="text-[#FF5A5A]">Choles Team.</span>
          </h1>
          <p className="mt-5 max-w-[560px] text-xl leading-relaxed text-[#E4E9F6]">
            Formamos niños, niñas y jóvenes en el baloncesto, con entrenamiento, competencia y una familia que los acompaña.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={inscripcion}
              target="_blank"
              rel="noopener noreferrer"
              className={`${COND} inline-flex min-h-[52px] items-center gap-2.5 rounded-md bg-[#D62828] px-7 text-xl font-bold uppercase tracking-[0.06em] text-white hover:bg-[#A61E1E]`}
            >
              Inscríbete <Arrow />
            </a>
            <Link
              href="/login"
              className={`${COND} inline-flex min-h-[52px] items-center rounded-md border-2 border-white bg-white/10 px-7 text-xl font-bold uppercase tracking-[0.06em] text-white hover:bg-white/20`}
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* Proximos eventos (salen del modulo Eventos del sitio web) */}
      <section aria-labelledby="eventos-titulo" className="border-t-4 border-[#D62828] bg-[#0E1B45] text-white">
        <div className="mx-auto max-w-[1200px] px-6 pb-14 pt-10">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="eventos-titulo" className={`${COND} text-[32px] font-extrabold uppercase tracking-[0.04em]`}>
              Próximos eventos
            </h2>
            <Link href="/eventos" className={`${COND} text-lg font-semibold uppercase tracking-[0.06em] text-white underline underline-offset-4`}>
              Ver todos los eventos
            </Link>
          </div>
          {eventos.length === 0 ? (
            <p className="text-lg text-[#D5DDF2]">Muy pronto anunciaremos nuevos torneos y actividades.</p>
          ) : (
            <div className="flex flex-wrap gap-5">
              {eventos.map((e, i) => {
                const { day, month } = dayMonth(e.date);
                return (
                  <article key={e.id} className="flex min-w-0 flex-[1_1_320px] items-center gap-5 rounded-[10px] bg-[#16295F] p-5">
                    <div
                      className={`${COND} w-[96px] shrink-0 rounded-lg py-3.5 text-center leading-none ${
                        i === 0 ? "bg-[#D62828] text-white" : "bg-white text-[#0E1B45]"
                      }`}
                    >
                      <div className="text-[38px] font-extrabold">{day}</div>
                      <div className="mt-1 text-lg font-bold tracking-[0.12em]">{month}</div>
                    </div>
                    <div className="min-w-0">
                      {e.timeLabel && (
                        <p className={`${COND} text-[15px] font-bold uppercase tracking-[0.14em] text-[#AFC0E8]`}>{e.timeLabel}</p>
                      )}
                      <h3 className={`${COND} mt-1 text-[26px] font-bold leading-[1.1]`}>{e.title}</h3>
                      {e.location && <p className="mt-1.5 text-base text-[#D5DDF2]">{e.location}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Categorias y horarios */}
      <section aria-labelledby="categorias-titulo" className="bg-[#F3F5FA]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-[88px]">
          <p className={KICKER}>Para cada edad</p>
          <h2 id="categorias-titulo" className={H2}>
            Nuestras categorías
          </h2>

          <div className="mt-8 flex flex-wrap items-center gap-4 rounded-xl bg-[#0E1B45] px-7 py-6 text-white">
            <h3 className={`${COND} mr-4 text-[26px] font-extrabold uppercase tracking-[0.04em]`}>Horarios</h3>
            <div className="flex min-w-0 flex-[1_1_260px] items-center gap-3.5">
              <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
                <path d="M3.5 10h17" />
                <path d="M8 3v4" />
                <path d="M16 3v4" />
              </svg>
              <div>
                <p className={`${COND} text-[22px] font-bold`}>Martes y jueves</p>
                <p className="mt-0.5 text-base text-[#D5DDF2]">4:00 p.m.</p>
              </div>
            </div>
            <div className="flex min-w-0 flex-[1_1_260px] items-center gap-3.5">
              <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
              </svg>
              <div>
                <p className={`${COND} text-[22px] font-bold`}>Sábados</p>
                <p className="mt-0.5 text-base text-[#D5DDF2]">8:00 a 11:00 a.m. · Entrenamiento grupal</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-6">
            {CATEGORIAS.map((c) => (
              <article
                key={c.code}
                className="min-w-0 flex-[1_1_300px] overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(14,27,69,0.06),0_8px_24px_rgba(14,27,69,0.08)]"
              >
                <img src={c.img} alt={c.alt} className="block aspect-[4/3] w-full object-cover" style={{ objectPosition: c.pos }} loading="lazy" />
                <div className="flex items-center justify-between gap-3 px-[22px] pb-[22px] pt-[18px]">
                  <div>
                    <h3 className={`${COND} text-[34px] font-extrabold leading-none`}>{c.code}</h3>
                    <p className="mt-1 text-base text-[#4A5878]">{c.edad}</p>
                  </div>
                  <a
                    href={buildWhatsAppLink(`Hola, quiero información de la categoría ${c.code}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center text-base font-bold text-[#D62828] underline underline-offset-4 hover:text-[#A61E1E]"
                  >
                    Inscribirme
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Por que Choles Team */}
      <section aria-labelledby="porque-titulo" className="bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-6 py-20 md:py-[88px]">
          <div className="min-w-0 flex-[1_1_380px]">
            <img
              src={FOTOS["jugador-sentado"]}
              alt="Jugador de Choles Team sentado sobre un balón en la cancha"
              className="block aspect-[4/5] w-full rounded-xl object-cover"
              style={{ objectPosition: "center 35%" }}
              loading="lazy"
            />
          </div>
          <div className="min-w-0 flex-[1_1_440px]">
            <p className={KICKER}>Más que entrenar</p>
            <h2 id="porque-titulo" className={H2}>
              ¿Por qué Choles Team?
            </h2>
            <div className="mt-8 flex flex-col gap-7">
              {RAZONES.map((r) => (
                <div key={r.n} className="flex gap-5">
                  <span aria-hidden="true" className={`${COND} w-14 shrink-0 text-[40px] font-extrabold leading-none text-[#D62828]`}>
                    {r.n}
                  </span>
                  <div>
                    <h3 className={`${COND} text-2xl font-bold uppercase`}>{r.t}</h3>
                    <p className="mt-1.5 text-[17px] leading-relaxed text-[#4A5878]">{r.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Franja con foto */}
      <section className="overflow-hidden bg-[#0E1B45] text-white">
        <div className="flex flex-wrap">
          <div className="flex min-w-0 flex-[1_1_480px] items-center">
            <div className="max-w-[640px] px-6 py-20 lg:pl-[max(24px,calc((100vw-1200px)/2+24px))]">
              <h2 className={`${COND} text-[clamp(44px,5.5vw,72px)] font-extrabold uppercase leading-[0.98]`}>
                Juntos, somos
                <br />
                <span className="text-[#FF5A5A]">Choles.</span>
              </h2>
              <p className="mt-5 text-[19px] leading-relaxed text-[#D5DDF2]">
                Desde la U8 hasta la U18, cada jugador encuentra en Choles Team un lugar para crecer, competir y divertirse.
              </p>
              <Link
                href="/mision-vision"
                className={`${COND} mt-7 inline-flex min-h-[48px] items-center rounded-md border-2 border-white px-6 text-lg font-bold uppercase tracking-[0.06em] text-white hover:bg-white/10`}
              >
                Conoce nuestra misión
              </Link>
            </div>
          </div>
          <div className="relative min-h-[460px] min-w-0 flex-[1_1_480px] md:min-h-[560px]">
            <img
              src={FOTOS["jugadora-dribla"]}
              alt="Jugadora de Choles Team driblando en la cancha"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: "center 55%" }}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* Galeria */}
      <section aria-labelledby="galeria-titulo" className="bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-[88px]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={KICKER}>Así vivimos el baloncesto</p>
              <h2 id="galeria-titulo" className={H2}>
                Galería
              </h2>
            </div>
            <Link href="/galeria" className={`${COND} text-lg font-bold uppercase tracking-[0.06em] text-[#D62828] underline underline-offset-4 hover:text-[#A61E1E]`}>
              Ver galería completa
            </Link>
          </div>
          <div className="mt-9 flex flex-wrap gap-4">
            {GALERIA.map((g) => (
              <img
                key={g.src}
                src={g.src}
                alt={g.alt}
                className={`h-[300px] min-w-0 shrink rounded-[10px] object-cover md:h-[380px] ${g.grow}`}
                style={{ objectPosition: g.pos }}
                loading="lazy"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Familias */}
      <section aria-labelledby="familias-titulo" className="bg-[#F3F5FA]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-6 py-20 md:py-[88px]">
          <div className="min-w-0 flex-[1_1_460px]">
            <p className={KICKER}>Choles Team App</p>
            <h2 id="familias-titulo" className={`${COND} mt-1.5 text-[clamp(40px,5vw,56px)] font-extrabold uppercase leading-none`}>
              Para las familias, todo desde el celular
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#4A5878]">
              Cada acudiente entra con su usuario y ve la información de su hijo en tiempo real.
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3.5">
              {FAMILIA_ITEMS.map((item) => (
                <li key={item} className="flex flex-[1_1_220px] items-center gap-2.5 text-[17px] font-medium">
                  <Check />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 flex-[1_1_340px] rounded-[14px] bg-[#0E1B45] px-8 py-9 text-white">
            <LogoCrest className="h-[72px]" alt="" />
            <h3 className={`${COND} mt-5 text-3xl font-extrabold uppercase`}>¿Ya eres parte del club?</h3>
            <p className="mt-2 text-[17px] leading-normal text-[#D5DDF2]">Entra con el usuario y la contraseña que te dio el club.</p>
            <Link
              href="/login"
              className={`${COND} mt-6 flex min-h-[52px] items-center justify-center rounded-md bg-[#D62828] text-xl font-bold uppercase tracking-[0.06em] text-white hover:bg-[#A61E1E]`}
            >
              Iniciar sesión
            </Link>
            <p className="mt-4 text-[15px] leading-normal text-[#C9D3EC]">
              ¿Aún no tienes acceso? Escríbenos por{" "}
              <a href={buildWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="text-white underline">
                WhatsApp
              </a>{" "}
              o a{" "}
              <a href={buildMailtoLink()} className="text-white underline">
                {CLUB_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Llamado final */}
      <section className="bg-[#D62828] text-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-7 px-6 py-16">
          <h2 className={`${COND} min-w-0 flex-[1_1_520px] text-[clamp(36px,4.5vw,54px)] font-extrabold uppercase leading-none`}>
            ¿Quieres que tu hijo haga parte de Choles Team?
          </h2>
          <a
            href={inscripcion}
            target="_blank"
            rel="noopener noreferrer"
            className={`${COND} inline-flex min-h-[56px] items-center gap-2.5 rounded-md bg-white px-[30px] text-[21px] font-extrabold uppercase tracking-[0.06em] text-[#0E1B45] hover:bg-[#F3F5FA]`}
          >
            Escríbenos por WhatsApp <Arrow />
          </a>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
