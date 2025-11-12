import type { Request } from "express";

import { asyncHandler } from "../../utils/asyncHandler";
import { createHttpError } from "../../middlewares/error";
import {
  archiveProduct,
  assertProductExistsOrThrow,
  createProduct,
  createProductMedia,
  createProductVariant,
  deleteProductMedia,
  getProductById,
  getProductBySlug,
  listProductMedia,
  listProducts,
  listProductVariants,
  updateProduct,
  updateProductMedia,
} from "./products.service";
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  productVariantCreateSchema,
  productMediaCreateSchema,
  productMediaIdParamSchema,
  productMediaPresignBodySchema,
  productMediaUpdateSchema,
  productSlugParamSchema,
  updateProductSchema,
} from "./products.schemas";
import { createProductMediaUpload } from "../../services/s3.service";

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

export const listProductMediaHandler = asyncHandler(async (req, res) => {
  const { id } = productIdParamSchema.parse(req.params);
  const media = await listProductMedia(id);
  res.json({ data: media });
});

export const createProductMediaPresignHandler = asyncHandler(
  async (req: Request, res) => {
    const { id } = productIdParamSchema.parse(req.params);
    await assertProductExistsOrThrow(id);
    const payload = productMediaPresignBodySchema.parse(req.body);
    const result = await createProductMediaUpload({
      productId: id,
      contentType: payload.contentType,
      fileName: payload.fileName,
    });
    res.status(201).json({
      data: {
        uploadUrl: result.uploadUrl,
        fileUrl: result.fileUrl,
      },
    });
  },
);

export const createProductMediaHandler = asyncHandler(async (req, res) => {
  const { id } = productIdParamSchema.parse(req.params);
  const payload = productMediaCreateSchema.parse(req.body);
  const media = await createProductMedia(id, payload);
  res.status(201).json({ data: media });
});

export const updateProductMediaHandler = asyncHandler(async (req, res) => {
  const { id } = productIdParamSchema.parse(req.params);
  const { mediaId } = productMediaIdParamSchema.parse(req.params);
  const payload = productMediaUpdateSchema.parse(req.body);
  const media = await updateProductMedia(id, mediaId, payload);
  res.json({ data: media });
});

export const deleteProductMediaHandler = asyncHandler(async (req, res) => {
  const { id } = productIdParamSchema.parse(req.params);
  const { mediaId } = productMediaIdParamSchema.parse(req.params);
  await deleteProductMedia(id, mediaId);
  res.status(204).send();
});

export const listProductVariantsHandler = asyncHandler(async (req, res) => {
  const { id } = productIdParamSchema.parse(req.params);
  const variants = await listProductVariants(id);
  res.json({ data: variants });
});

export const createProductVariantHandler = asyncHandler(async (req, res) => {
  const { id } = productIdParamSchema.parse(req.params);
  const payload = productVariantCreateSchema.parse(req.body);
  const variant = await createProductVariant(id, payload);
  res.status(201).json({ data: variant });
});
