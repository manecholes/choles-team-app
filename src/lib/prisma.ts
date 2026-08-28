import { PrismaClient } from "@prisma/client";

/**
 * Patron singleton recomendado por Prisma para Next.js: evita crear una
 * nueva instancia de PrismaClient (y por lo tanto una nueva pool de
 * conexiones a MySQL) en cada hot-reload durante desarrollo.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
