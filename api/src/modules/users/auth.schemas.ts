import { z } from "zod";

import { createUserSchema } from "./users.schemas";

export const registerSchema = createUserSchema;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
