import { Router } from "express";

import { authenticate } from "../../middlewares/auth";
import { buyNowCheckoutHandler, submitCheckoutHandler } from "./checkout.controller";

const router = Router();

router.post("/", authenticate(false), submitCheckoutHandler);
router.post("/buy-now", authenticate(false), buyNowCheckoutHandler);

export const checkoutRoutes = router;
