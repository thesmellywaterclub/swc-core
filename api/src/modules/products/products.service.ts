import { Prisma } from "@prisma/client";

import { deleteObjectByUrl } from "../../services/s3.service";
import { env } from "../../env";
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
      liveOffer: {
        include: {
          seller: true,
          sellerLocation: true,
          offer: true,
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

type VariantWithRelations = Prisma.ProductVariantGetPayload<{
  include: {
    liveOffer: {
      include: {
        seller: true;
        sellerLocation: true;
        offer: true;
      };
    };
  };
}>;

const productMediaSelect = Prisma.validator<Prisma.ProductMediaSelect>()({
  id: true,
  productId: true,
  url: true,
  alt: true,
  sortOrder: true,
  isPrimary: true,
});

type ProductMediaRecord = Prisma.ProductMediaGetPayload<{
  select: typeof productMediaSelect;
}>;

export type ProductMediaItem = {
  id: string;
  productId: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

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

function mapVariant(variant: VariantWithRelations): ProductVariant {
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
    (variant) => (variant.bestOffer?.stockQty ?? 0) > 0
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

function mapProductMediaItem(media: ProductMediaRecord): ProductMediaItem {
  const normalizedUrl = normalizeMediaUrl(media.url);
  return {
    id: media.id,
    productId: media.productId,
    url: normalizedUrl,
    alt: media.alt ?? null,
    sortOrder: media.sortOrder,
    isPrimary: media.isPrimary,
  };
}

function normalizeMediaUrl(url: string): string {
  if (!env.s3PublicUrl) {
    return url;
  }

  const trimmedCdn = env.s3PublicUrl.replace(/\/+$/, "");
  const bucketHost = `${env.s3BucketName}.s3.${env.awsRegion}.amazonaws.com`;
  const bucketPrefix = `https://${bucketHost}`;

  if (url.startsWith(bucketPrefix)) {
    const path = url.slice(bucketPrefix.length).replace(/^\/+/, "");
    return `${trimmedCdn}/${path}`;
  }

  return url;
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

export async function assertProductExistsOrThrow(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!product) {
    throw createHttpError(404, "Product not found");
  }
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
          liveOffer: {
            include: {
              seller: true,
              sellerLocation: true,
              offer: true,
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

export async function listProductVariants(
  productId: string
): Promise<ProductVariant[]> {
  await assertProductExistsOrThrow(productId);
  const variants = await prisma.productVariant.findMany({
    where: { productId },
    include: {
      liveOffer: {
        include: {
          seller: true,
          sellerLocation: true,
          offer: true,
        },
      },
    },
    orderBy: [
      { isActive: "desc" },
      { sizeMl: "asc" },
      { createdAt: "asc" },
    ],
  });
  return variants.map(mapVariant);
}

export type CreateProductVariantInput = {
  sizeMl: number;
  sku: string;
  mrpPaise: number;
  salePaise?: number | null;
};

export async function createProductVariant(
  productId: string,
  input: CreateProductVariantInput
): Promise<ProductVariant> {
  await assertProductExistsOrThrow(productId);

  try {
    const variant = await prisma.productVariant.create({
      data: {
        productId,
        sizeMl: input.sizeMl,
        sku: input.sku,
        mrpPaise: input.mrpPaise,
        salePaise: input.salePaise ?? null,
      },
      include: {
        liveOffer: {
          include: {
            seller: true,
            sellerLocation: true,
            offer: true,
          },
        },
      },
    });

    return mapVariant(variant);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw createHttpError(
        409,
        "Variant SKU must be unique",
        { target: error.meta?.target }
      );
    }
    throw error;
  }
}

export async function listProductMedia(
  productId: string
): Promise<ProductMediaItem[]> {
  await assertProductExistsOrThrow(productId);
  const records = await prisma.productMedia.findMany({
    where: { productId },
    orderBy: [{ sortOrder: "asc" }],
    select: productMediaSelect,
  });
  return records.map(mapProductMediaItem);
}

export type CreateProductMediaInput = {
  url: string;
  alt?: string;
  isPrimary?: boolean;
  sortOrder?: number;
};

export async function createProductMedia(
  productId: string,
  input: CreateProductMediaInput
): Promise<ProductMediaItem> {
  await assertProductExistsOrThrow(productId);

  const currentMax = await prisma.productMedia.aggregate({
    where: { productId },
    _max: { sortOrder: true },
  });
  const nextSortOrder =
    input.sortOrder ?? (typeof currentMax._max.sortOrder === "number" ? currentMax._max.sortOrder + 1 : 0);

  const media = await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.productMedia.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    const created = await tx.productMedia.create({
      data: {
        productId,
        url: input.url,
        alt: input.alt?.trim() || null,
        isPrimary: Boolean(input.isPrimary),
        sortOrder: nextSortOrder,
      },
      select: productMediaSelect,
    });

    return created;
  });

  return mapProductMediaItem(media);
}

export type UpdateProductMediaInput = {
  alt?: string;
  isPrimary?: boolean;
  sortOrder?: number;
};

export async function updateProductMedia(
  productId: string,
  mediaId: string,
  input: UpdateProductMediaInput
): Promise<ProductMediaItem> {
  await assertProductExistsOrThrow(productId);

  const media = await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.productMedia.updateMany({
        where: {
          productId,
          NOT: { id: mediaId },
        },
        data: { isPrimary: false },
      });
    }

    const updated = await tx.productMedia.update({
      where: { id: mediaId },
      data: {
        ...(input.alt !== undefined ? { alt: input.alt.trim() || null } : {}),
        ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
      select: productMediaSelect,
    });

    if (updated.productId !== productId) {
      throw createHttpError(400, "Media item does not belong to this product");
    }

    return updated;
  });

  return mapProductMediaItem(media);
}

export async function deleteProductMedia(
  productId: string,
  mediaId: string
): Promise<void> {
  await assertProductExistsOrThrow(productId);

  const media = await prisma.productMedia.findUnique({
    where: { id: mediaId },
    select: productMediaSelect,
  });

  if (!media || media.productId !== productId) {
    throw createHttpError(404, "Product media not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.productMedia.delete({
      where: { id: mediaId },
    });

    if (media.isPrimary) {
      const fallback = await tx.productMedia.findFirst({
        where: { productId },
        orderBy: [{ sortOrder: "asc" }],
        select: { id: true },
      });

      if (fallback) {
        await tx.productMedia.update({
          where: { id: fallback.id },
          data: { isPrimary: true },
        });
      }
    }
  });

  await deleteObjectByUrl(media.url);
}
