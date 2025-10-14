import type { Request } from "express";

import { asyncHandler } from "../../utils/asyncHandler";
import { loginUser, registerUser, getAuthenticatedUser } from "./auth.service";
import { loginSchema, registerSchema } from "./auth.schemas";

export const registerHandler = asyncHandler(async (req: Request, res) => {
  const payload = registerSchema.parse(req.body);
  const result = await registerUser(payload);
  res.status(201).json({ data: result });
});

export const loginHandler = asyncHandler(async (req: Request, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const result = await loginUser(email, password);
  res.json({ data: result });
});

type RequestWithAuth = Request & {
  auth?: {
    userId: string;
    email: string;
  };
};

export const meHandler = asyncHandler(async (req: Request, res) => {
  const auth = (req as RequestWithAuth).auth;

  if (!auth) {
    return res.status(401).json({
      error: {
        message: "Not authenticated",
      },
    });
  }

  const user = await getAuthenticatedUser(auth.userId);
  res.json({ data: user });
});
