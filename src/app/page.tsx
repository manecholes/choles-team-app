import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { CLUB_EMAIL } from "@/lib/site-contact";

const h = React.createElement;

const FEATURES = [
  {
        title: "Jugadores",
        description:
                "Perfil completo: datos, familia, categoria, equipo, documentos y observaciones.",
  },
  {
        title: "Equipos y categorias",
        description:
                "Plantillas, entrenadores, delegados y horarios organizados por categoria.",
  },
  {
        title: "Entrenamientos",
        description:
                "Asistencia en segundos y calculo automatico de porcentajes por jugador y equipo.",
  },
  {
        title: "Partidos y torneos",
        description:
                "Resultados, estadisticas de juego y fixtures generados automaticamente.",
  },
  {
        title: "Pagos y cartera",
        description:
                "Matriculas, mensualidades y recibos en PDF, con control de morosidad.",
  },
  {
        title: "Rendimiento deportivo",
        description:
                "Evaluaciones fisicas, carga de entrenamiento (RPE) y evolucion del jugador.",
  },
  ];

const FAMILIA_ITEMS = [
    "Proximo entrenamiento y partido",
    "Calendario del equipo",
    "Estado de pagos y recibos",
    "Rendimiento deportivo",
    "Asistencia",
    "Comunicados del club",
  ];

/**
 * Punto de entrada publico de la app (cholesteam.com).
 * Si hay sesion valida se envia directo al dashboard; si no, se muestra
 * esta landing page publica del club. El boton "Iniciar sesion" lleva a
 * /login, la plataforma real de la escuela.
 *
 * Se escribe con React.createElement (sin JSX) por restricciones del
 * editor usado para este cambio; el comportamiento es identico a JSX.
 */
export default async function HomePage() {
    const user = await getCurrentUser();
    if (user) {
          redirect("/dashboard");
    }

  return h(
        "main",
    { className: "min-h-screen bg-slate-50" },
        h(PublicHeader),
        h(
                "section",
          { className: "bg-turqui-700 text-white" },
                h(
                          "div",
                  {
                              className:
                                            "max-w-6xl mx-auto px-6 pt-10 pb-20 md:pt-16 md:pb-28 text-center",
                  },
                          h(
                                      "p",
                            {
                                          className:
                                                          "uppercase tracking-widest text-turqui-100 text-xs md:text-sm font-semibold mb-4",
                            },
                                      "Escuela y club de baloncesto"
                                    ),
                          h(
                                      "h1",
                            { className: "text-3xl md:text-5xl font-extrabold leading-tight" },
                                      "Juntos, somos ",
                                      h("span", { className: "text-choles-red" }, "Choles Team"),
                                      "."
                                    ),
                          h(
                                      "p",
                            {
                                          className:
                                                          "mt-5 max-w-2xl mx-auto text-turqui-100 text-base md:text-lg",
                            },
                                      "La plataforma que centraliza entrenamientos, partidos, torneos, pagos, asistencia, rendimiento deportivo y comunicacion con las familias de Choles Team, todo en un solo lugar."
                                    ),
                          h(
                                      "div",
                            { className: "mt-8 flex flex-col sm:flex-row gap-3 justify-center" },
                                      h(
                                                    Link,
                                        { href: "/login", className: "btn-danger px-6 py-3 text-base" },
                                                    "Iniciar sesion"
                                                  ),
                                      h(
                                                    "a",
                                        {
                                                        href: "#modulos",
                                                        className:
                                                                          "btn bg-white/10 text-white border border-white/30 hover:bg-white/20 px-6 py-3 text-base",
                                        },
                                                    "Conocer la plataforma"
                                                  )
                                    )
                        )
              ),
        h(
                "section",
          { id: "modulos", className: "max-w-6xl mx-auto px-6 py-16" },
                h(
                          "h2",
                  {
                              className:
                                            "text-2xl md:text-3xl font-bold text-turqui-700 text-center",
                  },
                          "Todo el club, en un solo lugar"
                        ),
                h(
                          "p",
                  { className: "mt-3 text-center text-slate-600 max-w-2xl mx-auto" },
                          "Administradores, entrenadores, delegados, padres y jugadores acceden a la informacion que necesitan, con el rol que les corresponde."
                        ),
                h(
                          "div",
                  {
                              className:
                                            "mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5",
                  },
                          FEATURES.map((f) =>
                                      h(
                                                    "div",
                                        { key: f.title, className: "card" },
                                                    h(
                                                                    "h3",
                                                      { className: "font-semibold text-turqui-700" },
                                                                    f.title
                                                                  ),
                                                    h("p", { className: "mt-1 text-sm text-slate-600" }, f.description)
                                                  )
                                               )
                        )
              ),
        h(
                "section",
          { className: "bg-white border-t border-slate-200" },
                h(
                          "div",
                  {
                              className:
                                            "max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center",
                  },
                          h(
                                      "div",
                                      null,
                                      h(
                                                    "h2",
                                        { className: "text-2xl md:text-3xl font-bold text-turqui-700" },
                                                    "Para las familias, todo desde el celular"
                                                  ),
                                      h(
                                                    "p",
                                        { className: "mt-4 text-slate-600" },
                                                    "Cada padre o tutor puede ver, en tiempo real, el proximo entrenamiento y partido de su hijo, el estado de sus pagos, su asistencia, su rendimiento deportivo y los comunicados del club."
                                                  ),
                                      h(
                                                    "ul",
                                        {
                                                        className:
                                                                          "mt-5 space-y-2 text-sm text-slate-700 list-disc pl-5",
                                        },
                                                    FAMILIA_ITEMS.map((item) => h("li", { key: item }, item))
                                                  )
                                    ),
                          h(
                                      "div",
                            { className: "card bg-turqui-50 border-turqui-100" },
                                      h(
                                                    "p",
                                        { className: "text-sm text-slate-600" },
                                                    "Ya tienes una cuenta en Choles Team App?"
                                                  ),
                                      h(
                                                    Link,
                                        {
                                                        href: "/login",
                                                        className: "btn-primary mt-4 w-full justify-center",
                                        },
                                                    "Iniciar sesion"
                                                  ),
                                      h(
                                                    "p",
                                        { className: "mt-4 text-xs text-slate-500" },
                                                    "Aun no tienes acceso? Escribe al club por WhatsApp o a ",
                                                    h(
                                                                    "a",
                                                      {
                                                                        href: `mailto:${CLUB_EMAIL}`,
                                                                        className: "text-turqui-600 underline",
                                                      },
                                                                    CLUB_EMAIL
                                                                  ),
                                                    "."
                                                  )
                                    )
                        )
              ),
        h(PublicFooter)
      );
}
