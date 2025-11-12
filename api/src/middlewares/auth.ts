import type { NextFunction, Request, Response } from "express";

import { createHttpError } from "./error";
import { verifyAccessToken } from "../modules/users/auth.service";

function extractToken(request: Request): string | undefined {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return undefined;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }

  return token;
}

type RequestWithAuth = Request & {
  auth?: {
    userId: string;
    email: string;
    sellerId: string | null;
    isAdmin: boolean;
  };
};

export function authenticate(required = true) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);

    if (!token) {
      if (required) {
        return next(createHttpError(401, "Authentication required"));
      }
      return next();
    }

    try {
      const payload = verifyAccessToken(token);
      (req as RequestWithAuth).auth = {
        userId: payload.sub,
        email: payload.email,
        sellerId: payload.sellerId ?? null,
        isAdmin: payload.isAdmin ?? false,
      };
      return next();
    } catch (error) {
      if (required) {
        return next(error);
      }

      return next();
    }
  };
}

export function requireAdmin() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const auth = (req as RequestWithAuth).auth;
    if (!auth || !auth.isAdmin) {
      return next(createHttpError(403, "Admin access required"));
    }
    return next();
  };
}
