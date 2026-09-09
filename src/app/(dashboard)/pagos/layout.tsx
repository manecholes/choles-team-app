import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

/**
 * Guardia de acceso para /pagos (administracion completa de pagos: crear,
 * editar, marcar pagado, generar mensualidades, borrar). El layout general
 * del dashboard solo verifica que haya sesion, no el rol — asi que sin este
 * guardia cualquier usuario logueado que conociera la URL (o que viera el
 * link "Pagos" en el menu, como pasaba con GUARDIAN/DELEGATE por tener
 * "payments:read_own") podia ABRIR la pantalla completa de administracion,
 * viendo los botones de Editar/Eliminar aunque el API los fuera a rechazar.
 * Con esto, solo quien tiene "payments:write" (ADMIN/SUPER_ADMIN) llega a
 * renderizar la pagina; el resto se redirige a su vista de solo lectura.
 */
export default async function PagosLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "payments:write")) {
    redirect(user.role === "GUARDIAN" || user.role === "PLAYER" ? "/mi-hijo" : "/dashboard");
  }
  return <>{children}</>;
}
