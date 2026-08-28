const TONE_CLASS: Record<string, string> = {
  green: "badge-green",
  yellow: "badge-yellow",
  red: "badge-red",
  gray: "badge-gray",
};

export function Badge({ tone, children }: { tone: "green" | "yellow" | "red" | "gray"; children: React.ReactNode }) {
  return <span className={TONE_CLASS[tone]}>{children}</span>;
}

/** Traduce estados de negocio comunes a (texto, tono) para reusar en toda la app. */
export function statusBadge(kind: "player" | "payment" | "match" | "tournament" | "category" | "team", value: string): { label: string; tone: "green" | "yellow" | "red" | "gray" } {
  const maps: Record<string, Record<string, { label: string; tone: "green" | "yellow" | "red" | "gray" }>> = {
    player: {
      ACTIVE: { label: "Activo", tone: "green" },
      INACTIVE: { label: "Inactivo", tone: "gray" },
      INJURED: { label: "Lesionado", tone: "yellow" },
      SUSPENDED: { label: "Suspendido", tone: "red" },
    },
    payment: {
      PAID: { label: "Pagado", tone: "green" },
      PENDING: { label: "Pendiente", tone: "yellow" },
      OVERDUE: { label: "Vencido", tone: "red" },
    },
    match: {
      SCHEDULED: { label: "Programado", tone: "gray" },
      IN_PROGRESS: { label: "En juego", tone: "yellow" },
      FINISHED: { label: "Finalizado", tone: "green" },
      CANCELLED: { label: "Cancelado", tone: "red" },
    },
    tournament: {
      PLANNED: { label: "Planeado", tone: "gray" },
      IN_PROGRESS: { label: "En curso", tone: "yellow" },
      FINISHED: { label: "Finalizado", tone: "green" },
    },
    category: {
      ACTIVE: { label: "Activa", tone: "green" },
      INACTIVE: { label: "Inactiva", tone: "gray" },
    },
    team: {
      ACTIVE: { label: "Activo", tone: "green" },
      INACTIVE: { label: "Inactivo", tone: "gray" },
    },
  };
  return maps[kind]?.[value] ?? { label: value, tone: "gray" };
}
