import { Router } from "express";

import { authenticate } from "../../middlewares/auth";
import {
  confirmRazorpayPaymentHandler,
  createRazorpaySessionHandler,
} from "./payments.controller";

const router = Router();

router.use(authenticate(false));

router.post("/orders/:orderId/razorpay", createRazorpaySessionHandler);
router.post("/orders/:orderId/razorpay/confirm", confirmRazorpayPaymentHandler);

export const paymentsRoutes = router;
