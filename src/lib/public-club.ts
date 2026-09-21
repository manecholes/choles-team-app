import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Resuelve el club cuyo contenido se muestra en el sitio publico
 * (cholesteam.com: inicio, mision-vision, galeria, eventos, tienda,
 * contacto). Hoy la plataforma sirve a un solo club (Choles Team); cuando
 * exista Choles Sports Platform (multi-club, puntos 23-24 del maestro)
 * esto deberia resolverse por dominio en vez de por slug fijo.
 */
export async function getPublicClub() {
  return prisma.club.findUnique({ where: { slug: "choles-team" } });
}
