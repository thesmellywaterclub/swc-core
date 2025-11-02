import { Router } from "express";

import { authenticate } from "../../middlewares/auth";
import {
  checkServiceabilityHandler,
  createShipmentHandler,
  trackShipmentHandler,
} from "./shipments.controller";

const router = Router();

router.post("/serviceability", authenticate(false), checkServiceabilityHandler);
router.post("/", authenticate(true), createShipmentHandler);
router.get("/:waybill/tracking", authenticate(false), trackShipmentHandler);

export const shipmentsRoutes = router;
