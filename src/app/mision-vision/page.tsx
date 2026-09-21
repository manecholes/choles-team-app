import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

const VALORES = [
  {
    title: "Disciplina",
    description: "Puntualidad, esfuerzo constante y compromiso con el equipo, dentro y fuera de la cancha.",
  },
  {
    title: "Respeto",
    description: "Por los companeros, los rivales, los arbitros y las familias que hacen parte del club.",
  },
  {
    title: "Trabajo en equipo",
    description: "El baloncesto se juega y se gana en equipo -- por eso somos Choles Team, no jugadores sueltos.",
  },
  {
    title: "Formacion integral",
    description: "Formamos jugadores y tambien personas: actitud, responsabilidad y buenos habitos de vida.",
  },
];

/** Pagina publica: Mision y Vision de la escuela (sin sesion). */
export default function MisionVisionPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <PublicHeader />

      <section className="bg-turqui-700 py-14 text-center text-white">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-turqui-100">Choles Team</p>
          <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Mision y Vision</h1>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card">
            <h2 className="text-lg font-bold text-turqui-700">Nuestra mision</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Formar jugadores y jugadoras de baloncesto con disciplina, valores y amor por el deporte,
              brindandoles un espacio seguro de entrenamiento, competencia y crecimiento personal, donde cada
              niño, niña y joven pueda desarrollar su talento al maximo -- dentro y fuera de la cancha.
            </p>
          </div>
          <div className="card">
            <h2 className="text-lg font-bold text-turqui-700">Nuestra visión</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Ser reconocidos como una de las escuelas de baloncesto formativo mas solidas de la region,
              destacando por la calidad de nuestros procesos deportivos, el acompañamiento a las familias y
              la proyeccion de nuestros jugadores a nivel competitivo.
            </p>
          </div>
        </div>

        <h2 className="mt-14 text-center text-2xl font-bold text-turqui-700">Nuestros valores</h2>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {VALORES.map((v) => (
            <div key={v.title} className="card">
              <h3 className="font-semibold text-turqui-700">{v.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{v.description}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          Este texto lo puede ajustar el club en cualquier momento -- solo dinos que quieres cambiar.
        </p>
      </section>

      <PublicFooter />
    </main>
  );
}
