import { Router } from "express";

import { authenticate, requireAdmin } from "../../middlewares/auth";

import {
  archiveProductHandler,
  createProductHandler,
  createProductMediaHandler,
  createProductMediaPresignHandler,
  createProductVariantHandler,
  deleteProductMediaHandler,
  getProductByIdHandler,
  getProductBySlugHandler,
  listProductVariantsHandler,
  listProductMediaHandler,
  listProductsHandler,
  updateProductHandler,
  updateProductMediaHandler,
} from "./products.controller";

const router = Router();

router.get("/", listProductsHandler);
router.get("/slug/:slug", getProductBySlugHandler);
router.get("/:id", getProductByIdHandler);
router.post("/", authenticate(), requireAdmin(), createProductHandler);
router.patch("/:id", authenticate(), requireAdmin(), updateProductHandler);
router.delete("/:id", authenticate(), requireAdmin(), archiveProductHandler);
router.get("/:id/media", authenticate(), requireAdmin(), listProductMediaHandler);
router.post(
  "/:id/media/presign",
  authenticate(),
  requireAdmin(),
  createProductMediaPresignHandler
);
router.post(
  "/:id/media",
  authenticate(),
  requireAdmin(),
  createProductMediaHandler
);
router.patch(
  "/:id/media/:mediaId",
  authenticate(),
  requireAdmin(),
  updateProductMediaHandler
);
router.delete(
  "/:id/media/:mediaId",
  authenticate(),
  requireAdmin(),
  deleteProductMediaHandler
);
router.get(
  "/:id/variants",
  authenticate(),
  requireAdmin(),
  listProductVariantsHandler
);
router.post(
  "/:id/variants",
  authenticate(),
  requireAdmin(),
  createProductVariantHandler
);

export const productsRoutes = router;
