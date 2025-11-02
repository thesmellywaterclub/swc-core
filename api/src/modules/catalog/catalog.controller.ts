import { asyncHandler } from "../../utils/asyncHandler";
import { variantListQuerySchema, variantSearchQuerySchema } from "./catalog.schemas";
import { listCatalogVariants, searchCatalogVariants } from "./catalog.service";

export const listCatalogVariantsHandler = asyncHandler(async (req, res) => {
  const { limit, brandId, productId } = variantListQuerySchema.parse(req.query);
  const variants = await listCatalogVariants({ limit, brandId, productId });
  res.json({ data: variants });
});

export const searchCatalogVariantsHandler = asyncHandler(async (req, res) => {
  const { q, limit } = variantSearchQuerySchema.parse(req.query);
  const variants = await searchCatalogVariants(q, { limit });
  res.json({ data: variants });
});
