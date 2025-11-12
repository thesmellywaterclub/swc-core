import {
  Prisma,
  OfferCondition,
  OfferAuth,
  LocationStatus,
} from "@prisma/client";

import { prisma } from "../../prisma";

type PrismaClientOrTx = Prisma.TransactionClient | typeof prisma;

function resolveClient(client?: PrismaClientOrTx): PrismaClientOrTx {
  return client ?? prisma;
}

export async function recomputeLiveOfferForVariant(
  variantId: string,
  client?: PrismaClientOrTx,
): Promise<void> {
  const db = resolveClient(client);
  const now = new Date();

  const bestOffer = await db.masterOffer.findFirst({
    where: {
      variantId,
      isActive: true,
      stockQty: { gt: 0 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      seller: {
        isActive: true,
      },
      sellerLocation: {
        status: LocationStatus.ACTIVE,
      },
    },
    orderBy: [
      { effectivePrice: "asc" },
      { authRank: "desc" },
      { condRank: "desc" },
      { createdAt: "asc" },
    ],
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          displayName: true,
          isActive: true,
        },
      },
      sellerLocation: {
        select: {
          id: true,
          label: true,
          status: true,
        },
      },
    },
  });

  if (!bestOffer) {
    await db.liveOffer.deleteMany({
      where: {
        variantId,
      },
    });
    return;
  }

  const updatePayload = {
    offerId: bestOffer.id,
    price: bestOffer.price,
    sellerId: bestOffer.sellerId,
    sellerLocationId: bestOffer.sellerLocationId,
    stockQtySnapshot: bestOffer.stockQty,
    condition: bestOffer.condition,
    authGrade: bestOffer.authGrade,
    computedAt: now,
  };

  await db.liveOffer.upsert({
    where: {
      variantId,
    },
    update: updatePayload,
    create: {
      variantId,
      ...updatePayload,
    },
  });
}
