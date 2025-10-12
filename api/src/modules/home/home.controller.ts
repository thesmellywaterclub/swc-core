import type { Request } from "express";

import { asyncHandler } from "../../utils/asyncHandler";
import { getHomePageData } from "./home.service";

function parseFeaturedLimit(request: Request): number | undefined {
  const limitParam = request.query.featuredLimit;

  if (typeof limitParam === "string") {
    const parsedLimit = Number.parseInt(limitParam, 10);
    if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
      return parsedLimit;
    }
  }

  return undefined;
}

export const getHomePage = asyncHandler(async (req, res) => {
  const featuredLimit = parseFeaturedLimit(req);
  const data = await getHomePageData(featuredLimit);

  res.json({ data });
});
