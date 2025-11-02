import type { NextFunction, Request, Response } from "express";

import { prisma } from "../prisma";
import { createHttpError } from "./error";

type RequestWithAuth = Request & {
  auth?: {
    userId: string;
    email: string;
    sellerId: string | null;
  };
};

export function requireSeller() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const request = req as RequestWithAuth;
    const auth = request.auth;

    if (!auth) {
      return next(createHttpError(401, "Authentication required"));
    }

    if (auth.sellerId) {
      return next();
    }

    try {
      const user = await prisma.user.findFirst({
        where: {
          id: auth.userId,
          deletedAt: null,
        },
        select: {
          sellerId: true,
        },
      });

      if (!user?.sellerId) {
        return next(createHttpError(403, "Seller access required"));
      }

      request.auth = {
        ...auth,
        sellerId: user.sellerId,
      };
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
