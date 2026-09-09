import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

/**
 * Guardia de acceso para /cartera (panel de morosidad de TODO el club).
 * Igual que en /pagos, el layout general del dashboard solo exige sesion,
 * no rol, asi que sin este guardia cualquier usuario logueado que conociera
 * la URL podia ver la deuda de todos los jugadores del club, no solo la
 * suya. Solo quien tiene "cartera:read" (ADMIN/SUPER_ADMIN) llega aqui.
 */
export default async function CarteraLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "cartera:read")) {
    redirect(user.role === "GUARDIAN" || user.role === "PLAYER" ? "/mi-hijo" : "/dashboard");
  }
  return <>{children}</>;
}
