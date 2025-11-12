import {
  Prisma,
  OfferAuth,
  OfferCondition,
  LocationStatus,
} from "@prisma/client";

import { prisma } from "../../prisma";
import { createHttpError } from "../../middlewares/error";
import { recomputeLiveOfferForVariant } from "../offers/offers.service";
import { getAuthenticatedUser } from "../users/auth.service";
import type { UserSummary } from "../users/users.service";
import type { RegisterSellerInput } from "./seller.schemas";

const AUTH_RANK_MAP: Record<OfferAuth, number> = {
  SEALED: 3,
  STORE_BILL: 2,
  VERIFIED_UNKNOWN: 1,
};

const CONDITION_RANK_MAP: Record<OfferCondition, number> = {
  NEW: 3,
  OPEN_BOX: 2,
  TESTER: 1,
};

const sellerSelect = Prisma.validator<Prisma.SellerSelect>()({
  id: true,
  name: true,
  displayName: true,
  email: true,
  phone: true,
  gstNumber: true,
  panNumber: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

const locationSelect = Prisma.validator<Prisma.SellerLocationSelect>()({
  id: true,
  label: true,
  address1: true,
  address2: true,
  status: true,
  delhiveryPickupCode: true,
  delhiveryVerified: true,
  city: true,
  state: true,
  pincode: true,
  contactName: true,
  contactPhone: true,
  lastVerifiedAt: true,
});

type SellerLocationRecord = Prisma.SellerLocationGetPayload<{
  select: typeof locationSelect;
}>;

type SellerRecord = Prisma.SellerGetPayload<{
  select: typeof sellerSelect;
}>;

export type SellerLocationSummary = {
  id: string;
  label: string;
  address1: string;
  address2: string | null;
  status: LocationStatus;
  delhiveryPickupCode: string;
  delhiveryVerified: boolean;
  city: string;
  state: string;
  pincode: string;
  contactName: string | null;
  contactPhone: string | null;
  lastVerifiedAt: string | null;
};

const offerInclude = Prisma.validator<Prisma.MasterOfferInclude>()({
  sellerLocation: {
    select: locationSelect,
  },
  variant: {
    select: {
      id: true,
      sku: true,
      sizeMl: true,
      mrpPaise: true,
      salePaise: true,
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
    },
  },
});

type OfferWithRelations = Prisma.MasterOfferGetPayload<{
  include: typeof offerInclude;
}>;

export type SellerOfferSummary = {
  id: string;
  partnerSku: string | null;
  price: number;
  shipping: number;
  mrp: number | null;
  stockQty: number;
  isActive: boolean;
  condition: OfferCondition;
  authGrade: OfferAuth;
  effectivePrice: number;
  expiresAt: string | null;
  authRank: number;
  condRank: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  variant: {
    id: string;
    sku: string;
    sizeMl: number;
    mrpPaise: number;
    salePaise: number | null;
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
  location: SellerLocationSummary;
};

export type SellerSummary = {
  id: string;
  name: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RegisterSellerResult = {
  seller: SellerSummary;
  location: SellerLocationSummary;
  user: UserSummary;
};

function mapLocation(location: SellerLocationRecord): SellerLocationSummary {
  return {
    id: location.id,
    label: location.label,
    address1: location.address1,
    address2: location.address2 ?? null,
    status: location.status,
    delhiveryPickupCode: location.delhiveryPickupCode,
    delhiveryVerified: location.delhiveryVerified,
    city: location.city,
    state: location.state,
    pincode: location.pincode,
    contactName: location.contactName ?? null,
    contactPhone: location.contactPhone ?? null,
    lastVerifiedAt: location.lastVerifiedAt
      ? location.lastVerifiedAt.toISOString()
      : null,
  };
}

function mapOffer(offer: OfferWithRelations): SellerOfferSummary {
  return {
    id: offer.id,
    partnerSku: offer.partnerSku ?? null,
    price: offer.price,
    shipping: offer.shipping,
    mrp: offer.mrp ?? null,
    stockQty: offer.stockQty,
    isActive: offer.isActive,
    condition: offer.condition,
    authGrade: offer.authGrade,
    effectivePrice: offer.effectivePrice,
    expiresAt: offer.expiresAt ? offer.expiresAt.toISOString() : null,
    authRank: offer.authRank,
    condRank: offer.condRank,
    version: offer.version,
    createdAt: offer.createdAt.toISOString(),
    updatedAt: offer.updatedAt.toISOString(),
    variant: {
      id: offer.variant.id,
      sku: offer.variant.sku,
      sizeMl: offer.variant.sizeMl,
      mrpPaise: offer.variant.mrpPaise,
      salePaise: offer.variant.salePaise ?? null,
      product: {
        id: offer.variant.product.id,
        title: offer.variant.product.title,
        slug: offer.variant.product.slug,
        brand: {
          id: offer.variant.product.brand.id,
          name: offer.variant.product.brand.name,
        },
      },
    },
    location: mapLocation(offer.sellerLocation),
  };
}

function mapSeller(entity: SellerRecord): SellerSummary {
  return {
    id: entity.id,
    name: entity.name,
    displayName: entity.displayName ?? null,
    email: entity.email ?? null,
    phone: entity.phone ?? null,
    gstNumber: entity.gstNumber ?? null,
    panNumber: entity.panNumber ?? null,
    isActive: entity.isActive,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export async function registerSellerAccount(
  userId: string,
  input: RegisterSellerInput
): Promise<RegisterSellerResult> {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      sellerId: true,
    },
  });

  if (!existingUser) {
    throw createHttpError(404, "User not found");
  }

  if (existingUser.sellerId) {
    throw createHttpError(409, "You are already registered as a seller");
  }

  const business = input.business;
  const pickup = input.pickup;

  try {
    let createdSeller: SellerRecord | undefined;
    let createdLocation: SellerLocationRecord | undefined;

    await prisma.$transaction(async (tx) => {
      createdSeller = await tx.seller.create({
        data: {
          name: business.legalName,
          displayName: business.displayName,
          email: business.email ?? existingUser.email ?? null,
          phone: business.phone ?? null,
          gstNumber: business.gstNumber ?? null,
          panNumber: business.panNumber ?? null,
        },
        select: sellerSelect,
      });

      createdLocation = await tx.sellerLocation.create({
        data: {
          sellerId: createdSeller.id,
          label: pickup.label,
          address1: pickup.addressLine1,
          address2: pickup.addressLine2 ?? null,
          city: pickup.city,
          state: pickup.state,
          pincode: pickup.pincode,
          delhiveryPickupCode: pickup.delhiveryPickupCode,
          contactName: pickup.contactName,
          contactPhone: pickup.contactPhone,
          delhiveryVerified: true,
          status: LocationStatus.ACTIVE,
          lastVerifiedAt: new Date(),
        },
        select: locationSelect,
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          isSeller: true,
          seller: {
            connect: { id: createdSeller.id },
          },
        },
      });
    });

    if (!createdSeller || !createdLocation) {
      throw createHttpError(500, "Failed to register seller");
    }

    const userSummary = await getAuthenticatedUser(userId);

    return {
      seller: mapSeller(createdSeller),
      location: mapLocation(createdLocation),
      user: userSummary,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const targets = Array.isArray(error.meta?.target)
        ? (error.meta?.target as string[])
        : typeof error.meta?.target === "string"
          ? [error.meta.target as string]
          : [];

      const matches = (needle: string) =>
        targets.some((entry) => entry.includes(needle));

      if (matches("gstNumber")) {
        throw createHttpError(
          409,
          "A seller with this GST number already exists"
        );
      }
      if (matches("panNumber")) {
        throw createHttpError(
          409,
          "A seller with this PAN number already exists"
        );
      }
      if (matches("delhiveryPickupCode")) {
        throw createHttpError(
          409,
          "This Delhivery pickup code is already registered"
        );
      }
    }

    throw error;
  }
}

export async function listSellerLocations(
  sellerId: string
): Promise<SellerLocationSummary[]> {
  const locations = await prisma.sellerLocation.findMany({
    where: {
      sellerId,
    },
    orderBy: {
      label: "asc",
    },
    select: locationSelect,
  });

  return locations.map(mapLocation);
}

export type UpsertSellerOfferInput = {
  offerId?: string;
  variantId: string;
  sellerLocationId: string;
  partnerSku?: string;
  price: number;
  shipping: number;
  stockQty: number;
  mrp?: number | null;
  isActive?: boolean;
  condition: OfferCondition;
  authGrade: OfferAuth;
  expiresAt?: string | null;
};

export type UpsertSellerOfferResult = {
  offer: SellerOfferSummary;
  operation: "created" | "updated";
};

function coerceExpiresAt(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createHttpError(400, "Invalid expiration date");
  }
  return parsed;
}

export async function upsertSellerOffer(
  sellerId: string,
  input: UpsertSellerOfferInput
): Promise<UpsertSellerOfferResult> {
  return prisma.$transaction(async (tx) => {
    const location = await tx.sellerLocation.findFirst({
      where: {
        id: input.sellerLocationId,
        sellerId,
      },
      select: { id: true },
    });

    if (!location) {
      throw createHttpError(400, "Seller location not found");
    }

    const variant = await tx.productVariant.findUnique({
      where: {
        id: input.variantId,
      },
      select: {
        id: true,
      },
    });

    if (!variant) {
      throw createHttpError(400, "Variant not found");
    }

    const expiresAt = coerceExpiresAt(input.expiresAt ?? null);

    const updatableFields = {
      sellerLocationId: input.sellerLocationId,
      variantId: variant.id,
      partnerSku: input.partnerSku ?? null,
      price: input.price,
      shipping: input.shipping,
      mrp: input.mrp ?? null,
      stockQty: input.stockQty,
      isActive:
        input.isActive !== undefined ? input.isActive : input.stockQty > 0,
      expiresAt,
      condition: input.condition,
      authGrade: input.authGrade,
      effectivePrice: input.price + input.shipping,
      authRank: AUTH_RANK_MAP[input.authGrade],
      condRank: CONDITION_RANK_MAP[input.condition],
    };

    let offer: OfferWithRelations;
    let operation: UpsertSellerOfferResult["operation"] = "created";

    let previousVariantId: string | null = null;

    if (input.offerId) {
      const existing = await tx.masterOffer.findFirst({
        where: {
          id: input.offerId,
          sellerId,
        },
        select: {
          id: true,
          version: true,
          variantId: true,
        },
      });

      if (!existing) {
        throw createHttpError(404, "Offer not found");
      }

      previousVariantId = existing.variantId;

      offer = await tx.masterOffer.update({
        where: {
          id: existing.id,
        },
        data: {
          ...updatableFields,
          version: existing.version + 1,
        },
        include: offerInclude,
      });
      operation = "updated";
    } else {
      const existingByVariant = await tx.masterOffer.findFirst({
        where: {
          sellerId,
          variantId: variant.id,
        },
        select: {
          id: true,
          version: true,
        },
      });

      if (existingByVariant) {
        offer = await tx.masterOffer.update({
          where: {
            id: existingByVariant.id,
          },
          data: {
            ...updatableFields,
            version: existingByVariant.version + 1,
          },
          include: offerInclude,
        });
        operation = "updated";
      } else {
        offer = await tx.masterOffer.create({
          data: {
            sellerId,
            ...updatableFields,
          },
          include: offerInclude,
        });
        operation = "created";
      }
    }

    await recomputeLiveOfferForVariant(variant.id, tx);
    if (previousVariantId && previousVariantId !== variant.id) {
      await recomputeLiveOfferForVariant(previousVariantId, tx);
    }

    return {
      offer: mapOffer(offer),
      operation,
    };
  });
}

export async function listSellerOffers(
  sellerId: string
): Promise<SellerOfferSummary[]> {
  const offers = await prisma.masterOffer.findMany({
    where: {
      sellerId,
    },
    include: offerInclude,
    orderBy: [
      {
        isActive: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
  });

  return offers.map(mapOffer);
}
