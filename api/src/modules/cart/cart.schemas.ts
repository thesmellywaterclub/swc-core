import { z } from "zod";

export const cartTokenHeader = "x-cart-token";

export const addCartItemSchema = z.object({
  variantId: z.string().min(1, "variantId is required"),
  quantity: z
    .union([z.number(), z.string()])
    .transform((value) => {
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
      return 1;
    })
    .pipe(z.number().int().min(1)),
});

export const updateCartItemSchema = z.object({
  quantity: z
    .union([z.number(), z.string()])
    .transform((value) => {
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
      return 0;
    })
    .pipe(z.number().int().min(0)),
});

export const cartItemParamsSchema = z.object({
  variantId: z.string().min(1, "variantId is required"),
});
