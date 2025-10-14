import type { Request } from "express";

import { asyncHandler } from "../../utils/asyncHandler";
import { createHttpError } from "../../middlewares/error";
import {
  archiveProduct,
  createProduct,
  getProductById,
  getProductBySlug,
  listProducts,
  updateProduct,
} from "./products.service";
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  productSlugParamSchema,
  updateProductSchema,
} from "./products.schemas";

export const listProductsHandler = asyncHandler(async (req, res) => {
  const filters = listProductsQuerySchema.parse(req.query);
  const result = await listProducts(filters);
  res.json({
    data: result.data,
    meta: {
      nextCursor: result.nextCursor ?? null,
    },
  });
});

export const getProductByIdHandler = asyncHandler(async (req, res) => {
  const { id } = productIdParamSchema.parse(req.params);
  const product = await getProductById(id);
  res.json({ data: product });
});

export const getProductBySlugHandler = asyncHandler(async (req, res) => {
  const { slug } = productSlugParamSchema.parse(req.params);
  const product = await getProductBySlug(slug);

  if (!product) {
    throw createHttpError(404, "Product not found");
  }

  res.json({ data: product });
});

export const createProductHandler = asyncHandler(async (req: Request, res) => {
  const payload = createProductSchema.parse(req.body);
  const product = await createProduct(payload);
  res.status(201).json({ data: product });
});

export const updateProductHandler = asyncHandler(async (req: Request, res) => {
  const { id } = productIdParamSchema.parse(req.params);
  const payload = updateProductSchema.parse(req.body);
  const product = await updateProduct(id, payload);
  res.json({ data: product });
});

export const archiveProductHandler = asyncHandler(async (req, res) => {
  const { id } = productIdParamSchema.parse(req.params);
  await archiveProduct(id);
  res.status(204).send();
});
