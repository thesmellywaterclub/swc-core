import type { Request } from "express";

import { asyncHandler } from "../../utils/asyncHandler";
import {
  createShipmentSchema,
  serviceabilitySchema,
  trackShipmentParamsSchema,
  trackShipmentQuerySchema,
} from "./shipments.schemas";
import {
  checkServiceAvailability,
  createShipmentForOrderItem,
  getShipmentTracking,
} from "./shipments.service";

type RequestWithAuth = Request & {
  auth?: {
    userId: string;
    email: string;
    sellerId: string | null;
  };
};

export const checkServiceabilityHandler = asyncHandler(async (req, res) => {
  const payload = serviceabilitySchema.parse(req.body);
  const result = await checkServiceAvailability(payload);
  res.json({ data: result });
});

export const createShipmentHandler = asyncHandler(async (req: Request, res) => {
  const payload = createShipmentSchema.parse(req.body);
  const request = req as RequestWithAuth;
  const result = await createShipmentForOrderItem(payload, request.auth?.userId ?? null);
  res.status(201).json({ data: result });
});

export const trackShipmentHandler = asyncHandler(async (req, res) => {
  const params = trackShipmentParamsSchema.parse(req.params);
  const query = trackShipmentQuerySchema.parse(req.query);
  const result = await getShipmentTracking(params.waybill, query.lastEventOnly ?? false);
  res.json({ data: result });
});
