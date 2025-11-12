import type { Request } from "express";

import { asyncHandler } from "../../utils/asyncHandler";
import { createBrand, listBrands } from "./brands.service";
import { createBrandSchema } from "./brands.schemas";

export const listBrandsHandler = asyncHandler(async (_req, res) => {
  const brands = await listBrands();
  res.json({ data: brands });
});

export const createBrandHandler = asyncHandler(async (req: Request, res) => {
  const payload = createBrandSchema.parse(req.body);
  const brand = await createBrand(payload.name);
  res.status(201).json({ data: brand });
});
