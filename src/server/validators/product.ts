import { z } from "zod";
import { imageUploadSchema } from "@/server/validators/media";

export const productSchema = z.object({
  name: z.string().min(1).max(191),
  description: z.string().max(2000).optional().or(z.literal("")),
  // "" (campo de precio vacio en el formulario) debe quedar como "sin precio",
  // no coercionarse a 0 -- por eso se convierte a undefined ANTES de que
  // z.coerce.number() intente parsear el string vacio (Number("") es 0, no NaN).
  price: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().nonnegative().optional()
  ),
  category: z.enum(["UNIFORME", "BALON", "ZAPATO", "CAMISETA", "GORRA", "OTRO"]),
  available: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  image: imageUploadSchema.optional(),
});
