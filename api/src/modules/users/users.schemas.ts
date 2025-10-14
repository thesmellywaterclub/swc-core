import { z } from "zod";

export const userIdParamSchema = z.object({
  id: z.uuid({
    message: "User id must be a valid UUID",
  }),
});

export const listUsersQuerySchema = z.object({
  cursor: z.uuid({ message: "Cursor must be a valid UUID" })
    .optional(),
  limit: z
    .union([z.string(), z.number(), z.undefined()])
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
      return undefined;
    })
    .pipe(
      z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
    ),
});

export const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  phone: z.string().min(8).max(20).optional(),
  avatarUrl: z.url().optional(),
  isSeller: z.boolean().optional(),
  clubMember: z.boolean().optional(),
  clubVerified: z.boolean().optional(),
});

export const updateUserSchema = createUserSchema
  .omit({ password: true, email: true })
  .extend({
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    phone: createUserSchema.shape.phone.optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided to update the user"
  );
