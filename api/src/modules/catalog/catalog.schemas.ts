import { z } from "zod";

export const variantSearchQuerySchema = z.object({
  q: z
    .union([z.string(), z.undefined(), z.null()])
    .transform((value) => (typeof value === "string" ? value.trim() : ""))
    .pipe(
      z
        .string()
        .min(2, "Search query must be at least 2 characters long")
    ),
  limit: z
    .union([z.string(), z.number(), z.undefined()])
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }
      if (typeof value === "number") {
        return value;
      }
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? undefined : parsed;
    })
    .pipe(
      z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
    ),
});

export const variantListQuerySchema = z.object({
  limit: z
    .union([z.string(), z.number(), z.undefined()])
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }
      if (typeof value === "number") {
        return value;
      }
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? undefined : parsed;
    })
    .pipe(
      z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
    ),
  brandId: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") {
        return undefined;
      }
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    })
    .optional(),
  productId: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") {
        return undefined;
      }
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    })
    .optional(),
});
