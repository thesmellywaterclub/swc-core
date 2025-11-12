import { z } from "zod";

const pincodeSchema = z.string().min(4).max(10);

const addressSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6).max(20),
  email: z.string().email().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1).default("India"),
  pincode: pincodeSchema,
});

const packageSchema = z.object({
  description: z.string().min(1),
  weightGrams: z.number().int().positive(),
  lengthCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  declaredValue: z.number().nonnegative(),
});

const locationSchema = z.object({
  pincode: pincodeSchema,
  city: z.string().optional(),
  state: z.string().optional(),
});

export const serviceabilitySchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  shipment: z
    .object({
      weightGrams: z.number().int().positive().optional(),
      paymentType: z.enum(["Prepaid", "COD"]).default("Prepaid"),
      declaredValue: z.number().nonnegative().optional(),
    })
    .optional(),
});

export type ServiceabilityInput = z.infer<typeof serviceabilitySchema>;
export const shippingQuoteSchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  shipment: z
    .object({
      paymentType: z.enum(["Prepaid", "COD"]).default("Prepaid"),
      weightGrams: z.number().int().positive().optional(),
      declaredValue: z.number().nonnegative().optional(),
      mode: z.enum(["E", "S"]).optional(),
    })
    .optional(),
});

export type ShippingQuoteInput = z.infer<typeof shippingQuoteSchema>;

export const createShipmentSchema = z.object({
  orderItemId: z.string().min(1),
  waybill: z.string().min(1).optional(),
  referenceNumber: z.string().min(1).optional(),
  paymentType: z.enum(["Prepaid", "COD"]).default("Prepaid"),
  codAmount: z.number().nonnegative().optional(),
  pickup: addressSchema,
  delivery: addressSchema,
  shipment: packageSchema,
  fragile: z.boolean().optional(),
  promisedDeliveryDate: z.string().datetime().optional(),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const trackShipmentParamsSchema = z.object({
  waybill: z.string().min(1),
});

export const trackShipmentQuerySchema = z.object({
  lastEventOnly: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === "boolean" || value === undefined) {
        return value;
      }
      const normalized = value.toLowerCase();
      return normalized === "true" || normalized === "1" || normalized === "yes";
    }),
});
