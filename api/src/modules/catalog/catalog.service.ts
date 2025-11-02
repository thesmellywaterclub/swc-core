import { Prisma } from "@prisma/client";

import { prisma } from "../../prisma";

const variantInclude = Prisma.validator<Prisma.ProductVariantInclude>()({
  product: {
    select: {
      id: true,
      title: true,
      slug: true,
      brand: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
});

type VariantWithProduct = Prisma.ProductVariantGetPayload<{
  include: typeof variantInclude;
}>;

export type CatalogVariantSearchItem = {
  id: string;
  sku: string;
  sizeMl: number;
  mrpPaise: number;
  salePaise: number | null;
  isActive: boolean;
  product: {
    id: string;
    title: string;
    slug: string;
    brand: {
      id: string;
      name: string;
    };
  };
};

function mapVariant(variant: VariantWithProduct): CatalogVariantSearchItem {
  return {
    id: variant.id,
    sku: variant.sku,
    sizeMl: variant.sizeMl,
    mrpPaise: variant.mrpPaise,
    salePaise: variant.salePaise ?? null,
    isActive: variant.isActive,
    product: {
      id: variant.product.id,
      title: variant.product.title,
      slug: variant.product.slug,
      brand: {
        id: variant.product.brand.id,
        name: variant.product.brand.name,
      },
    },
  };
}

type SearchVariantsOptions = {
  limit?: number;
};

export async function searchCatalogVariants(
  query: string,
  options: SearchVariantsOptions = {}
): Promise<CatalogVariantSearchItem[]> {
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 20);

  const variants = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      product: {
        isActive: true,
      },
      OR: [
        {
          sku: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          product: {
            title: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
        {
          product: {
            brand: {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    },
    include: variantInclude,
    orderBy: [
      {
        product: {
          title: "asc",
        },
      },
      {
        sizeMl: "asc",
      },
    ],
    take: limit,
  });

  return variants.map(mapVariant);
}

type ListVariantsOptions = {
  limit?: number;
  brandId?: string;
  productId?: string;
};

export async function listCatalogVariants(
  options: ListVariantsOptions = {}
): Promise<CatalogVariantSearchItem[]> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 200);

  const variants = await prisma.productVariant.findMany({
    where: {
      product: {
        isActive: true,
        ...(options.brandId ? { brandId: options.brandId } : {}),
      },
      isActive: true,
      ...(options.productId ? { productId: options.productId } : {}),
    },
    include: variantInclude,
    orderBy: [
      {
        product: {
          brand: {
            name: "asc",
          },
        },
      },
      {
        product: {
          title: "asc",
        },
      },
      { sizeMl: "asc" },
    ],
    take: limit,
  });

  return variants.map(mapVariant);
}
