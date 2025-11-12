import { Router } from "express";

import { authenticate, requireAdmin } from "../../middlewares/auth";
import { createBrandHandler, listBrandsHandler } from "./brands.controller";

const router = Router();

router.get("/", listBrandsHandler);
router.post("/", authenticate(), requireAdmin(), createBrandHandler);

export const brandsRoutes = router;
