"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProducts = getProducts;
exports.getProductBySlug = getProductBySlug;
exports.getDefaultVariant = getDefaultVariant;
exports.getFeaturedProducts = getFeaturedProducts;
const prisma_1 = require("../../prisma");
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
};
const emptyNotes = { top: [], heart: [], base: [] };
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function coerceStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((item) => typeof item === "string");
}
function coerceNotes(notes) {
    if (!isRecord(notes)) {
        return emptyNotes;
    }
    return {
        top: coerceStringArray(notes.top),
        heart: coerceStringArray(notes.heart),
        base: coerceStringArray(notes.base),
    };
}
function mapVariant(variant) {
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
function mapAggregates(product, variants) {
    const activeVariants = variants.filter((variant) => variant.isActive);
    const variantPrices = activeVariants
        .map((variant) => variant.salePaise ?? variant.mrpPaise)
        .filter((price) => typeof price === "number");
    const fallbackLowPrice = variantPrices.length ? Math.min(...variantPrices) : null;
    const fallbackInStock = activeVariants.filter((variant) => (variant.inventory?.stock ?? 0) > 0).length;
    return {
        ratingAvg: product.aggr ? Number(product.aggr.ratingAvg) : 0,
        ratingCount: product.aggr?.ratingCount ?? 0,
        reviewCount: product.aggr?.reviewCount ?? product.aggr?.ratingCount ?? 0,
        lowPricePaise: product.aggr?.lowPricePaise ?? fallbackLowPrice,
        inStockVariants: product.aggr?.inStockVariants ?? fallbackInStock,
    };
}
function mapProduct(entity) {
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
async function fetchProduct(where) {
    const product = await prisma_1.prisma.product.findUnique({
        where,
        include: productInclude,
    });
    return product ? mapProduct(product) : undefined;
}
async function getProducts() {
    const rows = await prisma_1.prisma.product.findMany({
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
async function getProductBySlug(slug) {
    return fetchProduct({ slug });
}
async function getDefaultVariant(slug) {
    const product = await prisma_1.prisma.product.findUnique({
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
async function getFeaturedProducts(limit = 4) {
    const take = Math.max(1, limit);
    const rows = await prisma_1.prisma.product.findMany({
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
