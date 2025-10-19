import type { Request } from "express";

import { asyncHandler } from "../../utils/asyncHandler";
import { createHttpError } from "../../middlewares/error";
import {
  cancelOrder,
  getOrderByContext,
  listOrdersForUser,
} from "./orders.service";
import {
  guestOrderLookupSchema,
  listOrdersQuerySchema,
  orderDetailQuerySchema,
  orderIdParamSchema,
} from "./orders.schemas";

type RequestWithAuth = Request & {
  auth?: {
    userId: string;
    email: string;
  };
};

export const listOrdersHandler = asyncHandler(async (req, res) => {
  const request = req as RequestWithAuth;
  const userId = request.auth?.userId;
  if (!userId) {
    throw createHttpError(401, "Authentication required");
  }

  const { cursor, limit } = listOrdersQuerySchema.parse(req.query);
  const result = await listOrdersForUser(userId, { cursor, limit });
  res.json(result);
});

export const getOrderHandler = asyncHandler(async (req, res) => {
  const request = req as RequestWithAuth;
  const { orderId } = orderIdParamSchema.parse(req.params);
  const { email } = orderDetailQuerySchema.parse(req.query);

  const context = {
    userId: request.auth?.userId,
    guestEmail: email,
  };

  const result = await getOrderByContext(orderId, context);
  res.json(result);
});

export const lookupGuestOrderHandler = asyncHandler(async (req, res) => {
  const { orderId, email } = guestOrderLookupSchema.parse(req.query);
  const result = await getOrderByContext(orderId, { guestEmail: email });
  res.json(result);
});

export const cancelOrderHandler = asyncHandler(async (req, res) => {
  const request = req as RequestWithAuth;
  const { orderId } = orderIdParamSchema.parse(req.params);
  const userId = request.auth?.userId;
  if (!userId) {
    throw createHttpError(401, "Authentication required");
  }

  const result = await cancelOrder(orderId, { userId });
  res.json(result);
});
