import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politica de Privacidad | Choles Team",
  description:
    "Politica de privacidad de Choles Team App: que datos recopilamos, para que los usamos y como los protegemos.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-turqui-700 mb-2">{title}</h2>
      <div className="space-y-3 text-sm leading-6 text-slate-700">
        {children}
      </div>
    </section>
  );
}

export default function PrivacidadPage() {
  const fechaActualizacion = "17 de septiembre de 2026";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-turqui-700 text-white py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm uppercase tracking-wide text-turqui-100">
            Choles Team
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">
            Politica de Privacidad
          </h1>
          <p className="mt-2 text-turqui-100 text-sm">
            Ultima actualizacion: {fechaActualizacion}
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-sm leading-6 text-slate-700 mb-8">
          Esta politica explica que informacion recopila{" "}
          <strong>Choles Team</strong> (la &quot;Escuela&quot; o el
          &quot;Club&quot;) a traves de la plataforma Choles Team App
          (sitio web, panel administrativo y canal de WhatsApp del club),
          para que se usa, con quien se comparte y que derechos tienen los
          usuarios sobre sus datos.
        </p>

        <Section title="1. Responsable del tratamiento">
          <p>
            Choles Team es responsable del tratamiento de los datos
            personales recopilados a traves de esta plataforma. Para
            cualquier consulta relacionada con esta politica o con tus
            datos, puedes escribir a{" "}
            <a
              href="mailto:contacto@cholesteam.com"
              className="text-turqui-600 underline"
            >
              contacto@cholesteam.com
            </a>
            .
          </p>
        </Section>

        <Section title="2. Que datos recopilamos">
          <p>Segun tu rol dentro del club, podemos recopilar:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Datos de jugadores:</strong> nombres, apellidos,
              documento de identidad, fecha de nacimiento, sexo, fotografia,
              direccion, EPS, contacto de emergencia, categoria, equipo,
              posicion, altura, peso y observaciones deportivas.
            </li>
            <li>
              <strong>Datos de padres, madres o tutores:</strong> nombre,
              telefono y relacion con el jugador, usados para
              comunicaciones y autorizaciones.
            </li>
            <li>
              <strong>Datos de entrenadores y delegados:</strong>
              informacion de contacto y credenciales de acceso a la
              plataforma.
            </li>
            <li>
              <strong>Datos deportivos:</strong> asistencia a
              entrenamientos, estadisticas de partidos, evaluaciones
              fisicas y de rendimiento.
            </li>
            <li>
              <strong>Datos administrativos y de pagos:</strong> concepto,
              valor, fecha, metodo y estado de los pagos realizados al
              club. La plataforma no almacena numeros completos de
              tarjetas ni claves bancarias.
            </li>
            <li>
              <strong>Comunicaciones:</strong> mensajes enviados o
              recibidos a traves del canal oficial de WhatsApp del club
              (por ejemplo, avisos de entrenamientos, partidos, pagos o
              comprobantes de transferencia que un padre o tutor decida
              enviar para confirmar un pago).
            </li>
            <li>
              <strong>Datos tecnicos basicos:</strong> registros de acceso
              a la plataforma, con fines de seguridad y auditoria.
            </li>
          </ul>
        </Section>

        <Section title="3. Para que usamos esta informacion">
          <ul className="list-disc pl-5 space-y-1">
            <li>Administrar la inscripcion y participacion de los jugadores en el club.</li>
            <li>Organizar entrenamientos, partidos, torneos y evaluaciones deportivas.</li>
            <li>Registrar y controlar pagos, matriculas y mensualidades.</li>
            <li>
              Enviar comunicados, recordatorios y responder preguntas de
              padres, tutores o jugadores a traves de WhatsApp u otros
              canales del club.
            </li>
            <li>Generar reportes y estadisticas internas del club.</li>
            <li>Cumplir obligaciones legales y contractuales del club.</li>
          </ul>
        </Section>

        <Section title="4. Datos de menores de edad">
          <p>
            Gran parte de los jugadores del club son menores de edad. Los
            datos de un menor solo se registran con el conocimiento y
            autorizacion de su padre, madre o tutor legal al momento de la
            inscripcion, y se usan exclusivamente para los fines deportivos
            y administrativos descritos en esta politica.
          </p>
        </Section>

        <Section title="5. Con quien compartimos la informacion">
          <p>
            No vendemos ni alquilamos datos personales a terceros. Podemos
            compartir informacion limitada con:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Proveedores tecnologicos que usamos para operar la
              plataforma (por ejemplo, servicios de hospedaje en la nube y
              la API de WhatsApp Business de Meta), unicamente en la
              medida necesaria para prestar el servicio.
            </li>
            <li>
              Autoridades competentes, cuando la ley lo exija.
            </li>
          </ul>
        </Section>

        <Section title="6. Seguridad de la informacion">
          <p>
            Aplicamos medidas razonables de seguridad para proteger los
            datos: contrasenas almacenadas de forma cifrada, control de
            acceso basado en roles (cada usuario solo ve lo que su rol le
            permite) y conexiones cifradas entre el navegador y nuestros
            servidores.
          </p>
        </Section>

        <Section title="7. Cuanto tiempo conservamos los datos">
          <p>
            Conservamos los datos mientras el jugador, padre/tutor,
            entrenador o delegado mantenga una relacion activa con el
            club, y durante el tiempo adicional que exijan obligaciones
            legales o administrativas (por ejemplo, historicos de pagos).
          </p>
        </Section>

        <Section title="8. Tus derechos">
          <p>
            Puedes solicitar en cualquier momento acceder, corregir,
            actualizar o solicitar la eliminacion de tus datos personales
            (o los de tu hijo o hija, si eres su padre, madre o tutor),
            escribiendo a{" "}
            <a
              href="mailto:contacto@cholesteam.com"
              className="text-turqui-600 underline"
            >
              contacto@cholesteam.com
            </a>
            . Atenderemos tu solicitud dentro de un plazo razonable.
          </p>
        </Section>

        <Section title="9. Cambios a esta politica">
          <p>
            Podemos actualizar esta politica de privacidad ocasionalmente
            para reflejar cambios en la plataforma o en la normativa
            aplicable. La fecha de la ultima actualizacion siempre
            aparecera en la parte superior de esta pagina.
          </p>
        </Section>

        <p className="text-xs text-slate-400 mt-10">
          Choles Team &mdash; &quot;Juntos, somos Choles Team.&quot;
        </p>
      </div>
    </main>
  );
}
