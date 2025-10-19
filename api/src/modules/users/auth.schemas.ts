import { z } from "zod";

import { createUserSchema } from "./users.schemas";

export const registerSchema = createUserSchema.extend({
  otpCode: z
    .string()
    .min(4)
    .max(10)
    .regex(/^[0-9]+$/, "OTP must be numeric"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const requestEmailOtpSchema = z.object({
  email: z.string().email(),
});
