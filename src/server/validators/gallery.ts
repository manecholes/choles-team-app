import { z } from "zod";
import { imageUploadSchema } from "@/server/validators/media";

export const gallerySchema = z.object({
  title: z.string().min(1).max(191),
  description: z.string().max(2000).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().default(0),
  image: imageUploadSchema.optional(),
});
