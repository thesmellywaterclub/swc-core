import { Prisma } from "@prisma/client";

import { prisma } from "../../prisma";
import { createHttpError } from "../../middlewares/error";

const brandInclude = Prisma.validator<Prisma.BrandInclude>()({
  _count: {
    select: {
      products: true,
    },
  },
});

type BrandWithCount = Prisma.BrandGetPayload<{
  include: typeof brandInclude;
}>;

export type BrandSummary = {
  id: string;
  name: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

function mapBrand(entity: BrandWithCount): BrandSummary {
  return {
    id: entity.id,
    name: entity.name,
    productCount: entity._count.products,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export async function listBrands(): Promise<BrandSummary[]> {
  const rows = await prisma.brand.findMany({
    include: brandInclude,
    orderBy: {
      name: "asc",
    },
  });

  return rows.map(mapBrand);
}

export async function createBrand(name: string): Promise<BrandSummary> {
  try {
    const created = await prisma.brand.create({
      data: { name },
      include: brandInclude,
    });
    return mapBrand(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw createHttpError(409, "A brand with this name already exists");
    }
    throw error;
  }
}
