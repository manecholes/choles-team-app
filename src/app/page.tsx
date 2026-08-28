import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/**
 * Punto de entrada de la app: si hay sesion valida se envia al dashboard,
 * si no, al login. La logica de permisos/rol se resuelve dentro del dashboard.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }
  redirect("/login");
}
