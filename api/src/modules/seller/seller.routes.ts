import { Router } from "express";

import { authenticate } from "../../middlewares/auth";
import { requireSeller } from "../../middlewares/seller";
import {
  listSellerLocationsHandler,
  listSellerOffersHandler,
  registerSellerHandler,
  upsertSellerOfferHandler,
} from "./seller.controller";

const router = Router();

router.post("/register", authenticate(), registerSellerHandler);

router.use(authenticate());
router.use(requireSeller());

router.get("/offers", listSellerOffersHandler);
router.post("/offers", upsertSellerOfferHandler);
router.get("/locations", listSellerLocationsHandler);

export const sellerRoutes = router;
