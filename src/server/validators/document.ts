import { z } from "zod";

export const uploadDocumentSchema = z.object({
  type: z.enum(["ID", "EPS", "AUTHORIZATION", "CERTIFICATE", "PHOTO", "OTHER"]),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  base64Data: z.string().min(1),
});
