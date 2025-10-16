import { Router } from "express";

import { authenticate } from "../../middlewares/auth";
import {
  addCartItemHandler,
  clearCartHandler,
  getCartHandler,
  removeCartItemHandler,
  updateCartItemHandler,
} from "./cart.controller";

const router = Router();

router.use(authenticate(false));

router.get("/", getCartHandler);
router.post("/items", addCartItemHandler);
router.patch("/items/:variantId", updateCartItemHandler);
router.delete("/items/:variantId", removeCartItemHandler);
router.delete("/", clearCartHandler);

export const cartRoutes = router;
