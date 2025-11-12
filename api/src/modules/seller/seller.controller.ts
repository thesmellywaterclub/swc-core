import type { Request } from "express";

import { asyncHandler } from "../../utils/asyncHandler";
import { createHttpError } from "../../middlewares/error";
import {
  listSellerLocations,
  listSellerOffers,
  registerSellerAccount,
  upsertSellerOffer,
} from "./seller.service";
import { registerSellerSchema, upsertSellerOfferSchema } from "./seller.schemas";

type RequestWithAuth = Request & {
  auth?: {
    userId: string;
    email: string;
    sellerId: string | null;
    isAdmin: boolean;
  };
};

function ensureSeller(req: RequestWithAuth): string {
  const sellerId = req.auth?.sellerId;
  if (!sellerId) {
    throw createHttpError(403, "Seller access required");
  }
  return sellerId;
}

export const registerSellerHandler = asyncHandler(async (req: Request, res) => {
  const auth = (req as RequestWithAuth).auth;
  if (!auth) {
    throw createHttpError(401, "Authentication required");
  }
  if (auth.sellerId) {
    throw createHttpError(409, "You are already registered as a seller");
  }
  const payload = registerSellerSchema.parse(req.body);
  const result = await registerSellerAccount(auth.userId, payload);
  res.status(201).json({ data: result });
});

export const listSellerLocationsHandler = asyncHandler(async (req, res) => {
  const sellerId = ensureSeller(req as RequestWithAuth);
  const locations = await listSellerLocations(sellerId);
  res.json({ data: locations });
});

export const listSellerOffersHandler = asyncHandler(async (req, res) => {
  const sellerId = ensureSeller(req as RequestWithAuth);
  const offers = await listSellerOffers(sellerId);
  res.json({ data: offers });
});

export const upsertSellerOfferHandler = asyncHandler(async (req: Request, res) => {
  const sellerId = ensureSeller(req as RequestWithAuth);
  const payload = upsertSellerOfferSchema.parse(req.body);
  const result = await upsertSellerOffer(sellerId, payload);
  const status = result.operation === "created" ? 201 : 200;
  res.status(status).json({ data: result });
});
