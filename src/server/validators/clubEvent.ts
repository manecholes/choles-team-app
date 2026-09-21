import { z } from "zod";
import { imageUploadSchema } from "@/server/validators/media";

export const clubEventSchema = z.object({
  title: z.string().min(1).max(191),
  description: z.string().max(2000).optional().or(z.literal("")),
  date: z.coerce.date(),
  timeLabel: z.string().max(191).optional().or(z.literal("")),
  location: z.string().max(191).optional().or(z.literal("")),
  image: imageUploadSchema.optional(),
});
