import { Prisma } from "@prisma/client";

import { prisma } from "../../prisma";
import { createHttpError } from "../../middlewares/error";
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
      liveOffer: {
        include: {
          seller: true,
          sellerLocation: true,
        },
      },
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
  include: {
    inventory: true;
    liveOffer: {
      include: {
        seller: true;
        sellerLocation: true;
      };
    };
  };
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

function hasAnyNote(notes: ProductNotes) {
  return Boolean(
    notes.top.length || notes.heart.length || notes.base.length
  );
}

function serializeNotesInput(notes?: ProductNotes | null) {
  if (!notes) {
    return Prisma.JsonNull;
  }

  const normalized: ProductNotes = {
    top: [...notes.top],
    heart: [...notes.heart],
    base: [...notes.base],
  };

  return hasAnyNote(normalized) ? normalized : Prisma.JsonNull;
}

function mapVariant(variant: VariantWithInventory): ProductVariant {
  const bestOffer = variant.liveOffer
    ? {
        offerId: variant.liveOffer.offerId,
        price: variant.liveOffer.price,
        sellerId: variant.liveOffer.sellerId,
        sellerName: variant.liveOffer.seller.displayName ?? variant.liveOffer.seller.name,
        sellerDisplayName: variant.liveOffer.seller.displayName ?? null,
        sellerLocationLabel: variant.liveOffer.sellerLocation.label,
        stockQty: variant.liveOffer.stockQtySnapshot,
        condition: variant.liveOffer.condition,
        authGrade: variant.liveOffer.authGrade,
        computedAt: variant.liveOffer.computedAt.toISOString(),
      }
    : null;

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
    bestOffer,
  };
}

function mapAggregates(
  product: ProductWithRelations,
  variants: ProductVariant[]
): ProductAggregatesDto {
  const activeVariants = variants.filter((variant) => variant.isActive);
  const variantPrices = activeVariants
    .map((variant) => variant.bestOffer?.price ?? variant.salePaise ?? variant.mrpPaise)
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

export type ListProductsOptions = {
  limit?: number;
  cursor?: string;
  gender?: Product["gender"];
  brandId?: string;
  isActive?: boolean;
  search?: string;
};

export async function listProducts(options: ListProductsOptions = {}) {
  const limit = options.limit ?? 20;
  const take = Math.min(Math.max(limit, 1), 50);
  const search = options.search?.trim();

  const where: Prisma.ProductWhereInput = {
    ...(options.isActive === undefined
      ? { isActive: true }
      : { isActive: options.isActive }),
    ...(options.gender ? { gender: options.gender } : {}),
    ...(options.brandId ? { brandId: options.brandId } : {}),
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { brand: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const rows = await prisma.product.findMany({
    include: productInclude,
    where,
    orderBy: [
      { createdAt: "desc" },
      { title: "asc" },
    ],
    take: take + 1,
    ...(options.cursor
      ? {
          skip: 1,
          cursor: { id: options.cursor },
        }
      : {}),
  });

  const hasMore = rows.length > take;
  const slice = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? slice[slice.length - 1]?.id : undefined;

  return {
    data: slice.map(mapProduct),
    nextCursor,
  };
}

export async function getProducts(): Promise<Product[]> {
  const result = await listProducts({ limit: 50 });
  return result.data;
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
        include: {
          inventory: true,
          liveOffer: {
            include: {
              seller: true,
              sellerLocation: true,
            },
          },
        },
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

export async function getProductById(id: string): Promise<Product> {
  const product = await fetchProduct({ id });

  if (!product) {
    throw createHttpError(404, "Product not found");
  }

  return product;
}

export type CreateProductInput = {
  slug: string;
  title: string;
  brandId: string;
  gender: Product["gender"];
  description?: string;
  notes?: ProductNotes | null;
  isActive?: boolean;
};

export async function createProduct(input: CreateProductInput): Promise<Product> {
  try {
    const product = await prisma.product.create({
      data: {
        slug: input.slug,
        title: input.title,
        brandId: input.brandId,
        gender: input.gender,
        description: input.description ?? null,
        isActive: input.isActive ?? true,
        notes: serializeNotesInput(input.notes ?? emptyNotes),
      },
      include: productInclude,
    });

    return mapProduct(product);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw createHttpError(
        409,
        "A product with one of the unique fields already exists",
        { target: error.meta?.target }
      );
    }
    throw error;
  }
}

export type UpdateProductInput = Partial<CreateProductInput>;

export async function updateProduct(
  id: string,
  input: UpdateProductInput
): Promise<Product> {
  await getProductById(id);

  const data: Prisma.ProductUpdateInput = {};

  if (input.slug !== undefined) {
    data.slug = input.slug;
  }
  if (input.title !== undefined) {
    data.title = input.title;
  }
  if (input.brandId !== undefined) {
    data.brand = { connect: { id: input.brandId } };
  }
  if (input.gender !== undefined) {
    data.gender = input.gender;
  }
  if (input.description !== undefined) {
    data.description = input.description ?? null;
  }
  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }
  if (input.notes !== undefined) {
    data.notes = input.notes ? serializeNotesInput(input.notes) : Prisma.JsonNull;
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data,
      include: productInclude,
    });

    return mapProduct(product);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw createHttpError(
        409,
        "A product with one of the unique fields already exists",
        { target: error.meta?.target }
      );
    }
    throw error;
  }
}

export async function archiveProduct(id: string): Promise<void> {
  await getProductById(id);

  await prisma.product.update({
    where: { id },
    data: {
      isActive: false,
    },
  });
}
