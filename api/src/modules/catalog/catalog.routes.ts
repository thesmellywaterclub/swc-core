import { Router } from "express";

import { authenticate } from "../../middlewares/auth";
import { requireSeller } from "../../middlewares/seller";
import { listCatalogVariantsHandler, searchCatalogVariantsHandler } from "./catalog.controller";

const router = Router();

router.use(authenticate());
router.use(requireSeller());

router.get("/variants", listCatalogVariantsHandler);
router.get("/variants/search", searchCatalogVariantsHandler);

export const catalogRoutes = router;
