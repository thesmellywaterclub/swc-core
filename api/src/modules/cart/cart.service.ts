import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "../../prisma";
import { createHttpError } from "../../middlewares/error";
import type { CartDto, CartItemDto, CartResponse } from "./cart.dto";

const GUEST_CART_TTL_DAYS = 14;

const CART_INCLUDE = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              brand: true,
            },
          },
        },
      },
    },
    orderBy: {
      addedAt: "asc",
    },
  },
} satisfies Prisma.CartInclude;

type CartWithRelations = Prisma.CartGetPayload<{
  include: typeof CART_INCLUDE;
}>;

export type CartContext = {
  userId?: string;
  guestToken?: string;
};

type ResolveOptions = {
  createIfMissing?: boolean;
};

function addDays(base: Date, days: number): Date {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function computeGuestExpiry(): Date {
  return addDays(new Date(), GUEST_CART_TTL_DAYS);
}

function generateGuestToken(): string {
  return crypto.randomUUID();
}

function mapCart(cart: CartWithRelations, activeGuestToken: string | undefined): CartResponse {
  const items: CartItemDto[] = cart.items.map((item) => {
    const variant = item.variant;
    const product = variant.product;
    const unitPrice = (variant.salePaise ?? variant.mrpPaise) || 0;

    return {
      variantId: item.variantId,
      quantity: item.quantity,
      variant: {
        id: variant.id,
        sku: variant.sku,
        sizeMl: variant.sizeMl,
        mrpPaise: variant.mrpPaise,
        salePaise: variant.salePaise ?? null,
      },
      product: {
        id: product.id,
        slug: product.slug,
        title: product.title,
        brand: {
          id: product.brand.id,
          name: product.brand.name,
        },
      },
      lineTotalPaise: unitPrice * item.quantity,
    };
  });

  const subtotal = items.reduce((total, item) => total + item.lineTotalPaise, 0);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  const cartDto: CartDto = {
    id: cart.id,
    userId: cart.userId ?? null,
    guestToken: cart.guestToken ?? null,
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
    expiresAt: cart.expiresAt ? cart.expiresAt.toISOString() : null,
    items,
    totals: {
      itemCount,
      subtotalPaise: subtotal,
    },
  };

  return {
    cart: cartDto,
    guestToken: activeGuestToken ?? null,
  };
}

async function fetchCartById(cartId: string): Promise<CartWithRelations> {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: CART_INCLUDE,
  });

  if (!cart) {
    throw createHttpError(404, "Cart not found");
  }

  return cart;
}

async function findGuestCart(token: string): Promise<CartWithRelations | null> {
  if (!token) {
    return null;
  }

  return prisma.cart.findFirst({
    where: {
      guestToken: token,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: CART_INCLUDE,
  });
}

async function mergeGuestIntoUserCart(
  userId: string,
  guestCart: CartWithRelations,
  existingUserCartId?: string
): Promise<CartWithRelations> {
  return prisma.$transaction(async (tx) => {
    let targetCart = existingUserCartId
      ? await tx.cart.findUnique({ where: { id: existingUserCartId }, include: CART_INCLUDE })
      : null;

    if (!targetCart) {
      targetCart = await tx.cart.create({
        data: { userId },
        include: CART_INCLUDE,
      });
    }

    for (const item of guestCart.items) {
      await tx.cartItem.upsert({
        where: {
          cartId_variantId: {
            cartId: targetCart.id,
            variantId: item.variantId,
          },
        },
        update: {
          quantity: {
            increment: item.quantity,
          },
        },
        create: {
          cartId: targetCart.id,
          variantId: item.variantId,
          quantity: item.quantity,
        },
      });
    }

    await tx.cart.delete({ where: { id: guestCart.id } });

    return tx.cart.findUniqueOrThrow({ where: { id: targetCart.id }, include: CART_INCLUDE });
  });
}

async function resolveCart(
  context: CartContext,
  options: ResolveOptions = {}
): Promise<{ cart: CartWithRelations | null; guestToken?: string }> {
  const { userId } = context;
  const inputGuestToken = context.guestToken?.trim();
  const expiry = computeGuestExpiry();
  let activeGuestToken = inputGuestToken;

  if (userId) {
    const [userCart, guestCart] = await Promise.all([
      prisma.cart.findFirst({ where: { userId }, include: CART_INCLUDE }),
      inputGuestToken ? findGuestCart(inputGuestToken) : Promise.resolve(null),
    ]);

    if (guestCart && guestCart.userId && guestCart.userId !== userId) {
      // Guest cart already assigned to someone else; ignore token.
      return {
        cart: userCart ?? (options.createIfMissing ? await prisma.cart.create({ data: { userId }, include: CART_INCLUDE }) : null),
        guestToken: undefined,
      };
    }

    if (userCart && guestCart && guestCart.id !== userCart.id) {
      const mergedCart = await mergeGuestIntoUserCart(userId, guestCart, userCart.id);
      return { cart: mergedCart, guestToken: undefined };
    }

    if (!userCart && guestCart) {
      const updated = await prisma.cart.update({
        where: { id: guestCart.id },
        data: {
          userId,
          guestToken: null,
          expiresAt: null,
        },
        include: CART_INCLUDE,
      });
      return { cart: updated, guestToken: undefined };
    }

    if (userCart) {
      return { cart: userCart, guestToken: undefined };
    }

    if (options.createIfMissing) {
      const created = await prisma.cart.create({
        data: { userId },
        include: CART_INCLUDE,
      });
      return { cart: created, guestToken: undefined };
    }

    return { cart: null, guestToken: undefined };
  }

  if (inputGuestToken) {
    const guestCart = await findGuestCart(inputGuestToken);
    if (guestCart) {
      const refreshed = await prisma.cart.update({
        where: { id: guestCart.id },
        data: {
          expiresAt: expiry,
        },
        include: CART_INCLUDE,
      });
      return { cart: refreshed, guestToken: guestCart.guestToken ?? inputGuestToken };
    }
  }

  if (options.createIfMissing) {
    const token = inputGuestToken ?? generateGuestToken();
    const created = await prisma.cart.create({
      data: {
        guestToken: token,
        expiresAt: expiry,
      },
      include: CART_INCLUDE,
    });
    return { cart: created, guestToken: token };
  }

  return { cart: null, guestToken: inputGuestToken };
}

async function ensureVariantExists(variantId: string) {
  const variant = await prisma.productVariant.findFirst({
    where: {
      id: variantId,
      isActive: true,
      product: {
        isActive: true,
      },
    },
    select: { id: true },
  });

  if (!variant) {
    throw createHttpError(404, "Variant not found or inactive");
  }
}

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return 0;
  }
  return Math.max(0, Math.trunc(quantity));
}

async function refreshCartResponse(cartId: string, guestToken: string | undefined): Promise<CartResponse> {
  const cart = await fetchCartById(cartId);
  return mapCart(cart, guestToken);
}

export async function getCart(context: CartContext): Promise<CartResponse> {
  const { cart, guestToken } = await resolveCart(context, { createIfMissing: true });

  if (!cart) {
    throw createHttpError(500, "Unable to create cart");
  }

  return mapCart(cart, guestToken);
}

export async function addItemToCart(
  context: CartContext,
  variantId: string,
  quantity: number
): Promise<CartResponse> {
  const normalizedQuantity = normalizeQuantity(quantity);
  if (normalizedQuantity < 1) {
    throw createHttpError(400, "Quantity must be at least 1");
  }

  await ensureVariantExists(variantId);

  const { cart, guestToken } = await resolveCart(context, { createIfMissing: true });
  if (!cart) {
    throw createHttpError(500, "Unable to create cart");
  }

  await prisma.cartItem.upsert({
    where: {
      cartId_variantId: {
        cartId: cart.id,
        variantId,
      },
    },
    update: {
      quantity: {
        increment: normalizedQuantity,
      },
    },
    create: {
      cartId: cart.id,
      variantId,
      quantity: normalizedQuantity,
    },
  });

  if (!context.userId) {
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        expiresAt: computeGuestExpiry(),
      },
    });
  }

  return refreshCartResponse(cart.id, guestToken);
}

export async function updateCartItemQuantity(
  context: CartContext,
  variantId: string,
  quantity: number
): Promise<CartResponse> {
  const normalizedQuantity = normalizeQuantity(quantity);

  const { cart, guestToken } = await resolveCart(context, { createIfMissing: true });
  if (!cart) {
    throw createHttpError(404, "Cart not found");
  }

  if (normalizedQuantity <= 0) {
    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        variantId,
      },
    });
  } else {
    await ensureVariantExists(variantId);

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId,
        },
      },
    });

    if (!existingItem) {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId,
          quantity: normalizedQuantity,
        },
      });
    } else {
      await prisma.cartItem.update({
        where: {
          cartId_variantId: {
            cartId: cart.id,
            variantId,
          },
        },
        data: {
          quantity: normalizedQuantity,
        },
      });
    }
  }

  if (!context.userId) {
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        expiresAt: computeGuestExpiry(),
      },
    });
  }

  return refreshCartResponse(cart.id, guestToken);
}

export async function removeCartItem(
  context: CartContext,
  variantId: string
): Promise<CartResponse> {
  const { cart, guestToken } = await resolveCart(context, { createIfMissing: true });
  if (!cart) {
    throw createHttpError(404, "Cart not found");
  }

  await prisma.cartItem.deleteMany({
    where: {
      cartId: cart.id,
      variantId,
    },
  });

  if (!context.userId) {
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        expiresAt: computeGuestExpiry(),
      },
    });
  }

  return refreshCartResponse(cart.id, guestToken);
}

export async function clearCart(context: CartContext): Promise<CartResponse> {
  const { cart, guestToken } = await resolveCart(context, { createIfMissing: true });
  if (!cart) {
    throw createHttpError(404, "Cart not found");
  }

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  if (!context.userId) {
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        expiresAt: computeGuestExpiry(),
      },
    });
  }

  return refreshCartResponse(cart.id, guestToken);
}
