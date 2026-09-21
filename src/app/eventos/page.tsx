import { CalendarDays, MapPin } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { listPublicClubEvents } from "@/server/services/clubEvent.service";
import { formatDateCO } from "@/lib/date-format";

function EventCard({
  event,
}: {
  event: {
    id: number;
    title: string;
    description: string | null;
    date: Date;
    timeLabel: string | null;
    location: string | null;
    imagePath: string | null;
  };
}) {
  return (
    <div className="card flex flex-col gap-3 sm:flex-row sm:items-start">
      {event.imagePath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/events/${event.id}/image`}
          alt={event.title}
          className="h-28 w-full rounded-xl object-cover sm:w-40"
        />
      ) : (
        <div className="flex h-28 w-full items-center justify-center rounded-xl bg-turqui-50 text-turqui-400 sm:w-40">
          <CalendarDays className="h-8 w-8" />
        </div>
      )}
      <div className="flex-1">
        <h3 className="font-semibold text-turqui-700">{event.title}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDateCO(event.date, { day: "numeric", month: "long", year: "numeric" })}
            {event.timeLabel ? ` -- ${event.timeLabel}` : ""}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.location}
            </span>
          )}
        </p>
        {event.description && <p className="mt-2 text-sm text-slate-600">{event.description}</p>}
      </div>
    </div>
  );
}

/** Pagina publica: Eventos del club (sin sesion), proximos y pasados. */
export default async function EventosPage() {
  const events = await listPublicClubEvents();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const proximos = events.filter((e) => e.date >= today).sort((a, b) => a.date.getTime() - b.date.getTime());
  const pasados = events.filter((e) => e.date < today);

  return (
    <main className="min-h-screen bg-slate-50">
      <PublicHeader />

      <section className="bg-turqui-700 py-14 text-center text-white">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-turqui-100">Choles Team</p>
          <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Eventos</h1>
          <p className="mt-3 text-turqui-100">Torneos, clinicas y actividades del club.</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-12 px-6 py-14">
        <div>
          <h2 className="text-xl font-bold text-turqui-700">Proximos eventos</h2>
          {proximos.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No hay eventos programados por ahora.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {proximos.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </div>

        {pasados.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-turqui-700">Eventos pasados</h2>
            <div className="mt-4 space-y-4 opacity-80">
              {pasados.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </div>
        )}
      </section>

      <PublicFooter />
    </main>
  );
}
