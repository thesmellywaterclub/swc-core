import { z } from "zod";

const nonEmptyString = z.string().min(1);

const recipientSchema = z.union([nonEmptyString, z.array(nonEmptyString).min(1)]);

const orderItemSchema = z.object({
  name: nonEmptyString,
  quantity: z.number().int().positive(),
  price: nonEmptyString,
});

const orderConfirmationDataSchema = z.object({
  customerName: nonEmptyString,
  orderNumber: nonEmptyString,
  orderDate: nonEmptyString,
  items: z.array(orderItemSchema).min(1),
  subtotal: nonEmptyString,
  shipping: nonEmptyString,
  total: nonEmptyString,
  supportEmail: nonEmptyString.optional(),
  viewOrderUrl: z.string().url().optional(),
});

const passwordResetDataSchema = z.object({
  customerName: nonEmptyString,
  resetUrl: z.string().url(),
  expiresInMinutes: z.number().int().positive(),
  supportEmail: nonEmptyString.optional(),
});

const emailVerificationOtpDataSchema = z.object({
  customerName: nonEmptyString,
  otpCode: nonEmptyString,
  expiresInMinutes: z.number().int().positive(),
  verificationUrl: z.string().url().optional(),
  supportEmail: nonEmptyString.optional(),
});

const newsletterSectionSchema = z.object({
  title: nonEmptyString,
  description: nonEmptyString,
  url: z.string().url().optional(),
});

const newsletterDataSchema = z
  .object({
    title: nonEmptyString,
    intro: nonEmptyString,
    sections: z.array(newsletterSectionSchema).optional(),
    ctaLabel: nonEmptyString.optional(),
    ctaUrl: z.string().url().optional(),
    unsubscribeUrl: z.string().url().optional(),
    previewText: nonEmptyString.optional(),
  })
  .refine(
    (value) => {
      if (value.ctaLabel && !value.ctaUrl) {
        return false;
      }

      if (value.ctaUrl && !value.ctaLabel) {
        return false;
      }

      return true;
    },
    {
      message: "ctaLabel and ctaUrl must be provided together",
      path: ["ctaUrl"],
    },
  );

export const sendEmailSchema = z.discriminatedUnion("type", [
  z.object({
    to: recipientSchema,
    type: z.literal("orderConfirmation"),
    data: orderConfirmationDataSchema,
  }),
  z.object({
    to: recipientSchema,
    type: z.literal("passwordReset"),
    data: passwordResetDataSchema,
  }),
  z.object({
    to: recipientSchema,
    type: z.literal("emailVerificationOtp"),
    data: emailVerificationOtpDataSchema,
  }),
  z.object({
    to: recipientSchema,
    type: z.literal("newsletter"),
    data: newsletterDataSchema,
  }),
]);

export type SendEmailSchema = z.infer<typeof sendEmailSchema>;
