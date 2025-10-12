import type { Prisma } from "@prisma/client";

import { prisma } from "../../prisma";
import type {
  Product,
  ProductNotes,
  ProductVariant,
  ProductAggregates as ProductAggregatesDto,
} from "./products.dto";

const productInclude = {
  brand: true,
  media: {
    orderBy: {
      sortOrder: "asc",
    },
  },
  variants: {
    include: {
      inventory: true,
    },
    orderBy: [
      { isActive: "desc" },
      { sizeMl: "asc" },
      { createdAt: "asc" },
    ],
  },
  aggr: true,
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

type VariantWithInventory = Prisma.ProductVariantGetPayload<{
  include: { inventory: true };
}>;

const emptyNotes: ProductNotes = { top: [], heart: [], base: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function coerceNotes(notes: unknown): ProductNotes {
  if (!isRecord(notes)) {
    return emptyNotes;
  }

  return {
    top: coerceStringArray(notes.top),
    heart: coerceStringArray(notes.heart),
    base: coerceStringArray(notes.base),
  };
}

function mapVariant(variant: VariantWithInventory): ProductVariant {
  return {
    id: variant.id,
    sku: variant.sku,
    sizeMl: variant.sizeMl,
    mrpPaise: variant.mrpPaise,
    salePaise: variant.salePaise ?? null,
    isActive: variant.isActive,
    inventory: variant.inventory
      ? {
          stock: variant.inventory.stock,
          reserved: variant.inventory.reserved,
        }
      : null,
  };
}

function mapAggregates(
  product: ProductWithRelations,
  variants: ProductVariant[]
): ProductAggregatesDto {
  const activeVariants = variants.filter((variant) => variant.isActive);
  const variantPrices = activeVariants
    .map((variant) => variant.salePaise ?? variant.mrpPaise)
    .filter((price): price is number => typeof price === "number");

  const fallbackLowPrice = variantPrices.length ? Math.min(...variantPrices) : null;
  const fallbackInStock = activeVariants.filter(
    (variant) => (variant.inventory?.stock ?? 0) > 0
  ).length;

  return {
    ratingAvg: product.aggr ? Number(product.aggr.ratingAvg) : 0,
    ratingCount: product.aggr?.ratingCount ?? 0,
    reviewCount: product.aggr?.reviewCount ?? product.aggr?.ratingCount ?? 0,
    lowPricePaise: product.aggr?.lowPricePaise ?? fallbackLowPrice,
    inStockVariants: product.aggr?.inStockVariants ?? fallbackInStock,
  };
}

function mapProduct(entity: ProductWithRelations): Product {
  const variants = entity.variants.map(mapVariant);
  const notes = coerceNotes(entity.notes);

  return {
    id: entity.id,
    slug: entity.slug,
    title: entity.title,
    gender: entity.gender,
    brand: {
      id: entity.brand.id,
      name: entity.brand.name,
    },
    notes,
    description: entity.description ?? "",
    isActive: entity.isActive,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
    media: entity.media.map((media) => ({
      id: media.id,
      url: media.url,
      alt: media.alt ?? null,
      sortOrder: media.sortOrder,
      isPrimary: media.isPrimary,
    })),
    variants,
    aggregates: mapAggregates(entity, variants),
  };
}

async function fetchProduct(
  where: Prisma.ProductWhereUniqueInput
): Promise<Product | undefined> {
  const product = await prisma.product.findUnique({
    where,
    include: productInclude,
  });

  return product ? mapProduct(product) : undefined;
}

export async function getProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    include: productInclude,
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return rows.map(mapProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return fetchProduct({ slug });
}

export async function getDefaultVariant(
  slug: string
): Promise<ProductVariant | undefined> {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      variants: {
        include: { inventory: true },
        orderBy: [
          { isActive: "desc" },
          { sizeMl: "asc" },
          { createdAt: "asc" },
        ],
        take: 1,
      },
    },
  });

  const [variant] = product?.variants ?? [];
  return variant ? mapVariant(variant) : undefined;
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  const take = Math.max(1, limit);
  const rows = await prisma.product.findMany({
    include: productInclude,
    where: {
      isActive: true,
    },
    orderBy: [
      { aggr: { ratingAvg: "desc" } },
      { aggr: { ratingCount: "desc" } },
      { createdAt: "desc" },
    ],
    take,
  });

  return rows.map(mapProduct);
}
