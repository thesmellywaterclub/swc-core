import type { Request } from "express";

import { asyncHandler } from "../../utils/asyncHandler";
import { createHttpError } from "../../middlewares/error";
import { cartTokenHeader } from "../cart/cart.schemas";
import type { CheckoutContext } from "./checkout.service";
import { buyNowCheckout, submitCheckout } from "./checkout.service";
import { buyNowSchema, checkoutSchema } from "./checkout.schemas";

type RequestWithAuth = Request & {
  auth?: {
    userId: string;
    email: string;
    sellerId: string | null;
    isAdmin: boolean;
  };
};

function extractGuestToken(req: Request): string | undefined {
  const raw = req.headers[cartTokenHeader];
  if (!raw) {
    return undefined;
  }
  return Array.isArray(raw) ? raw[0] : raw;
}

type CheckoutContextOptions = {
  requireGuestTokenForCart?: boolean;
};

function buildCheckoutContext(
  req: RequestWithAuth,
  options: CheckoutContextOptions = {}
): CheckoutContext {
  const guestToken = extractGuestToken(req)?.trim() || undefined;
  const userId = req.auth?.userId;

  if (!userId && options.requireGuestTokenForCart && !guestToken) {
    throw createHttpError(401, "Guest cart token is required");
  }

  return {
    userId: userId || undefined,
    guestToken,
  };
}

export const submitCheckoutHandler = asyncHandler(async (req: Request, res) => {
  const context = buildCheckoutContext(req as RequestWithAuth, {
    requireGuestTokenForCart: true,
  });
  const payload = checkoutSchema.parse(req.body);

  const result = await submitCheckout(context, payload);

  res.status(201).json({ data: result.order });
});

export const buyNowCheckoutHandler = asyncHandler(async (req: Request, res) => {
  const context = buildCheckoutContext(req as RequestWithAuth);
  const payload = buyNowSchema.parse(req.body);

  const result = await buyNowCheckout(context, payload);

  res.status(201).json({ data: result.order });
});
