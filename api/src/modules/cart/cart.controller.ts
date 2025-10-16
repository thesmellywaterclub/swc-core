import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandler";
import type { CartContext } from "./cart.service";
import { addItemToCart, clearCart, getCart, removeCartItem, updateCartItemQuantity } from "./cart.service";
import {
  addCartItemSchema,
  cartItemParamsSchema,
  cartTokenHeader,
  updateCartItemSchema,
} from "./cart.schemas";
import type { CartResponse } from "./cart.dto";

type RequestWithAuth = Request & {
  auth?: {
    userId: string;
    email: string;
  };
};

function extractGuestToken(req: Request): string | undefined {
  const raw = req.headers[cartTokenHeader];
  if (!raw) {
    return undefined;
  }
  return Array.isArray(raw) ? raw[0] : raw;
}

function buildCartContext(req: RequestWithAuth): CartContext {
  const guestToken = extractGuestToken(req);
  return {
    userId: req.auth?.userId,
    guestToken: guestToken?.trim() || undefined,
  };
}

function sendCartResponse(res: Response, payload: CartResponse) {
  return res.json({
    data: payload.cart,
    meta: {
      guestToken: payload.guestToken,
    },
  });
}

export const getCartHandler = asyncHandler(async (req, res) => {
  const context = buildCartContext(req as RequestWithAuth);
  const payload = await getCart(context);
  sendCartResponse(res, payload);
});

export const addCartItemHandler = asyncHandler(async (req, res) => {
  const context = buildCartContext(req as RequestWithAuth);
  const { variantId, quantity } = addCartItemSchema.parse(req.body);
  const payload = await addItemToCart(context, variantId, quantity);
  sendCartResponse(res, payload);
});

export const updateCartItemHandler = asyncHandler(async (req, res) => {
  const context = buildCartContext(req as RequestWithAuth);
  const { variantId } = cartItemParamsSchema.parse(req.params);
  const { quantity } = updateCartItemSchema.parse(req.body);
  const payload = await updateCartItemQuantity(context, variantId, quantity);
  sendCartResponse(res, payload);
});

export const removeCartItemHandler = asyncHandler(async (req, res) => {
  const context = buildCartContext(req as RequestWithAuth);
  const { variantId } = cartItemParamsSchema.parse(req.params);
  const payload = await removeCartItem(context, variantId);
  sendCartResponse(res, payload);
});

export const clearCartHandler = asyncHandler(async (req, res) => {
  const context = buildCartContext(req as RequestWithAuth);
  const payload = await clearCart(context);
  sendCartResponse(res, payload);
});
