import { OfferAuth, OfferCondition } from "@prisma/client";
import { z } from "zod";

const phoneSchema = z.string().trim().min(6).max(20);

export const registerSellerSchema = z.object({
  business: z.object({
    legalName: z.string().trim().min(2, "Legal name is required"),
    displayName: z.string().trim().min(2, "Display name is required"),
    email: z.string().email().optional(),
    phone: phoneSchema.optional(),
    gstNumber: z.string().trim().min(5).max(20).optional(),
    panNumber: z.string().trim().min(5).max(20).optional(),
  }),
  pickup: z.object({
    label: z.string().trim().min(1, "Location label is required"),
    addressLine1: z.string().trim().min(1, "Address line 1 is required"),
    addressLine2: z.string().trim().optional(),
    city: z.string().trim().min(1, "City is required"),
    state: z.string().trim().min(1, "State is required"),
    country: z.string().trim().min(1).default("India"),
    pincode: z.string().trim().min(4).max(10),
    delhiveryPickupCode: z.string().trim().min(3, "Pickup code is required"),
    contactName: z.string().trim().min(1, "Contact name is required"),
    contactPhone: phoneSchema,
    contactEmail: z.string().email().optional(),
  }),
  acceptTerms: z
    .boolean()
    .optional()
    .transform((value) => value ?? false)
    .refine((value) => value === true, "You must accept the seller terms to continue"),
});

const numericField = z
  .union([z.string(), z.number()])
  .transform((value) => {
    if (typeof value === "number") {
      return value;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return Number.NaN;
    }
    return Number(trimmed);
  });

export const upsertSellerOfferSchema = z.object({
  offerId: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    })
    .optional(),
  variantId: z
    .string()
    .trim()
    .min(1, "Variant is required"),
  sellerLocationId: z
    .string()
    .trim()
    .min(1, "Seller location is required"),
  partnerSku: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    })
    .optional(),
  price: numericField.pipe(z.number().int().min(1, "Price must be at least 1")),
  shipping: z
    .union([z.string(), z.number(), z.undefined()])
    .transform((value) => {
      if (value === undefined) {
        return 0;
      }
      if (typeof value === "number") {
        return value;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        return 0;
      }
      const parsed = Number(trimmed);
      return Number.isNaN(parsed) ? Number.NaN : parsed;
    })
    .pipe(z.number().int().min(0)),
  stockQty: numericField.pipe(
    z.number().int().min(0, "Stock quantity cannot be negative")
  ),
  mrp: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === undefined || value === null) {
        return null;
      }
      if (typeof value === "number") {
        return value;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = Number(trimmed);
      return Number.isNaN(parsed) ? Number.NaN : parsed;
    })
    .pipe(z.number().int().min(0).nullable())
    .optional(),
  isActive: z.boolean().optional(),
  condition: z.nativeEnum(OfferCondition).default(OfferCondition.NEW),
  authGrade: z.nativeEnum(OfferAuth).default(OfferAuth.SEALED),
  expiresAt: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === undefined || value === null) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    })
    .pipe(z.string().nullable())
    .optional(),
});

export type RegisterSellerInput = z.infer<typeof registerSellerSchema>;
