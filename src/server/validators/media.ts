import { z } from "zod";

/**
 * Esquema compartido para subir una imagen embebida en base64 dentro del
 * mismo JSON del formulario (mismo patron que documentos, ver
 * uploadDocumentSchema en validators/document.ts). Lo usan Galeria,
 * Eventos del sitio y Tienda -- todo contenido publico del sitio web.
 */
export const imageUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  base64Data: z.string().min(1),
});
