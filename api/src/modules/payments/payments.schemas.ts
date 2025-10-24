import { z } from "zod";

export const paymentOrderParamSchema = z.object({
  orderId: z.string().uuid("orderId must be a valid UUID"),
});

export const paymentSessionBodySchema = z
  .object({
    contact: z
      .object({
        name: z
          .string()
          .trim()
          .min(1, "contact.name cannot be empty")
          .max(120, "contact.name is too long")
          .optional(),
        email: z.string().email().optional(),
        phone: z
          .string()
          .trim()
          .min(5, "contact.phone must be at least 5 characters")
          .max(20, "contact.phone must be at most 20 characters")
          .optional(),
      })
      .optional(),
    guestEmail: z.string().email().optional(),
  })
  .strict();

export const paymentConfirmationBodySchema = z
  .object({
    razorpayOrderId: z.string().min(1, "razorpayOrderId is required"),
    razorpayPaymentId: z.string().min(1, "razorpayPaymentId is required"),
    razorpaySignature: z.string().min(1, "razorpaySignature is required"),
    guestEmail: z.string().email().optional(),
  })
  .strict();

export type PaymentSessionBody = z.infer<typeof paymentSessionBodySchema>;
export type PaymentConfirmationBody = z.infer<typeof paymentConfirmationBodySchema>;
