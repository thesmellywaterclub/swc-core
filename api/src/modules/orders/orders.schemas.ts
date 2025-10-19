import { z } from "zod";

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid({ message: "Order id must be a valid UUID" }),
});

export const listOrdersQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z
    .string()
    .transform((value) => {
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? undefined : parsed;
    })
    .optional()
    .pipe(z.number().int().min(1).max(50).optional()),
});

export const guestOrderLookupSchema = z.object({
  orderId: z.string().uuid({ message: "Order id must be a valid UUID" }),
  email: z.string().email(),
});

export const orderDetailQuerySchema = z.object({
  email: z.string().email().optional(),
});
