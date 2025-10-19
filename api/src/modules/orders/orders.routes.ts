import { Router } from "express";

import { authenticate } from "../../middlewares/auth";
import {
  cancelOrderHandler,
  getOrderHandler,
  listOrdersHandler,
  lookupGuestOrderHandler,
} from "./orders.controller";

const router = Router();

router.get("/lookup", lookupGuestOrderHandler);

router.use(authenticate(false));

router.get("/", listOrdersHandler);
router.get("/:orderId", getOrderHandler);
router.post("/:orderId/cancel", cancelOrderHandler);

export const ordersRoutes = router;
