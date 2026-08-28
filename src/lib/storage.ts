import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Adaptador de almacenamiento de archivos (punto 2 y 30 del maestro:
 * "estructura preparada para almacenamiento cloud"). Hoy solo implementa
 * el driver "local" (carpeta /storage del proyecto); cuando se quiera
 * migrar a S3/otro proveedor cloud, solo hay que agregar un nuevo driver
 * que cumpla esta misma interfaz y cambiar STORAGE_DRIVER en .env — el
 * resto de la aplicacion (servicios de documentos, recibos) no cambia.
 */

export interface SavedFile {
  /** Ruta relativa almacenada en BD (independiente del driver) */
  relativePath: string;
  sizeBytes: number;
}

const BASE_PATH = process.env.STORAGE_LOCAL_PATH || "./storage";

export async function saveBase64File(
  subfolder: string,
  fileName: string,
  base64Data: string
): Promise<SavedFile> {
  const driver = process.env.STORAGE_DRIVER || "local";
  if (driver !== "local") {
    throw new Error(
      `Driver de almacenamiento "${driver}" no implementado todavia. Solo "local" esta disponible en esta entrega.`
    );
  }

  const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  const buffer = Buffer.from(cleanBase64, "base64");

  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const dir = path.join(process.cwd(), BASE_PATH, subfolder);
  await fs.mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, safeName);
  await fs.writeFile(fullPath, buffer);

  return {
    relativePath: path.join(subfolder, safeName),
    sizeBytes: buffer.byteLength,
  };
}

export async function deleteStoredFile(relativePath: string): Promise<void> {
  const driver = process.env.STORAGE_DRIVER || "local";
  if (driver !== "local") return;
  const fullPath = path.join(process.cwd(), BASE_PATH, relativePath);
  await fs.unlink(fullPath).catch(() => {
    /* si el archivo ya no existe, no es un error fatal */
  });
}

export function getFileAbsolutePath(relativePath: string): string {
  return path.join(process.cwd(), BASE_PATH, relativePath);
}
