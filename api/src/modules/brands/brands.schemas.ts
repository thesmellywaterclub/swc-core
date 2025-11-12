import { z } from "zod";

export const createBrandSchema = z.object({
  name: z
    .string()
    .min(2, "Brand name must be at least 2 characters")
    .max(120, "Brand name must be at most 120 characters")
    .transform((value) => value.trim()),
});
