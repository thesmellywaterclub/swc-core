import { z } from "zod";

const addressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().min(5).max(20).optional(),
});

const contactSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(5).max(20).optional(),
});

export const checkoutSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema,
  notes: z.string().max(1000).optional(),
  contact: contactSchema.optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type ContactInput = z.infer<typeof contactSchema>;

export const buyNowItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z
    .number()
    .int()
    .min(1),
});

export const buyNowSchema = checkoutSchema.extend({
  item: buyNowItemSchema,
});

export type BuyNowInput = z.infer<typeof buyNowSchema>;
