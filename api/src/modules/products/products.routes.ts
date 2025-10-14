import { Router } from "express";

import {
  archiveProductHandler,
  createProductHandler,
  getProductByIdHandler,
  getProductBySlugHandler,
  listProductsHandler,
  updateProductHandler,
} from "./products.controller";

const router = Router();

router.get("/", listProductsHandler);
router.get("/slug/:slug", getProductBySlugHandler);
router.get("/:id", getProductByIdHandler);
router.post("/", createProductHandler);
router.patch("/:id", updateProductHandler);
router.delete("/:id", archiveProductHandler);

export const productsRoutes = router;
