import type { Prisma } from "@prisma/client";

import { prisma } from "../../prisma";
import { createHttpError } from "../../middlewares/error";
import type { CartContext } from "../cart/cart.service";
import { getCart } from "../cart/cart.service";
import type { CheckoutInput, BuyNowInput } from "./checkout.schemas";
import type { CheckoutOrderDto, CheckoutOrderItemDto, CheckoutResponseDto } from "./checkout.dto";

export type CheckoutContext = CartContext;

const ORDER_INCLUDE = {
  items: {
    include: {
      variant: {
        include: {
          product: true,
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function submitCheckout(
  context: CheckoutContext,
  input: CheckoutInput
): Promise<CheckoutResponseDto> {
  const isGuest = !context.userId;
  if (isGuest && !context.guestToken) {
    throw createHttpError(401, "Guest token is required for guest checkout");
  }

  const contactEmail = input.contact?.email;
  if (isGuest && !contactEmail) {
    throw createHttpError(400, "Contact email is required for guest checkout");
  }

  const cartResponse = await getCart({
    userId: context.userId,
    guestToken: context.guestToken,
  });

  const cart = cartResponse.cart;

  if (cart.items.length === 0) {
    throw createHttpError(400, "Cart is empty");
  }

  const cartId = cart.id;

  const result = await prisma.$transaction(async (tx) => {
    const cartRecord = await tx.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!cartRecord) {
      throw createHttpError(404, "Cart not found");
    }

    if (cartRecord.items.length === 0) {
      throw createHttpError(400, "Cart is empty");
    }

    let subtotal = 0;
    const taxPaise = 0;
    const shippingPaise = 0;
    const discountPaise = 0;

    const orderItemsData = cartRecord.items.map((item) => {
      const variant = item.variant;
      const product = variant.product;
      if (!variant.isActive || !product.isActive) {
        throw createHttpError(400, "Cart contains inactive product");
      }

      const inventory = variant.inventory;
      if (!inventory) {
        throw createHttpError(400, "Inventory unavailable for variant");
      }

      if (inventory.stock < item.quantity) {
        throw createHttpError(400, "Insufficient stock for item");
      }

      const unitPrice = variant.salePaise ?? variant.mrpPaise;
      if (unitPrice == null) {
        throw createHttpError(400, "Pricing unavailable for item");
      }
      const quantity = item.quantity;
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      return {
        variantId: variant.id,
        productId: product.id,
        sizeMl: variant.sizeMl,
        unitPricePaise: unitPrice,
        quantity,
        lineTotalPaise: lineTotal,
      };
    });

    const totalPaise = subtotal + taxPaise + shippingPaise - discountPaise;

    for (const item of cartRecord.items) {
      const inventory = item.variant.inventory;
      if (!inventory) {
        continue;
      }

      await tx.inventory.update({
        where: { variantId: item.variantId },
        data: {
          stock: {
            decrement: item.quantity,
          },
          reserved: {
            increment: item.quantity,
          },
        },
      });
    }

    const noteValue = input.notes?.trim() || null;

    const order = await tx.order.create({
      data: {
        userId: context.userId ?? null,
        guestEmail: contactEmail,
        subtotalPaise: subtotal,
        taxPaise,
        shippingPaise,
        discountPaise,
        totalPaise,
        billingAddress: toJsonValue(input.billingAddress),
        shippingAddress: toJsonValue(input.shippingAddress),
        notes: noteValue,
        items: {
          create: orderItemsData,
        },
      },
      include: ORDER_INCLUDE,
    });

    await tx.cartItem.deleteMany({
      where: { cartId },
    });

    return order as OrderWithRelations;
  });

  const response: CheckoutResponseDto = {
    order: mapOrderToDto(result),
  };

  return response;
}

function mapOrderToDto(order: OrderWithRelations): CheckoutOrderDto {
  const toRecord = (value: Prisma.JsonValue): Record<string, unknown> => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  };

  const items: CheckoutOrderItemDto[] = order.items.map((item) => ({
    id: item.id,
    variantId: item.variantId,
    productId: item.productId,
    title: item.variant.product.title,
    quantity: item.quantity,
    sizeMl: item.sizeMl,
    unitPricePaise: item.unitPricePaise,
    lineTotalPaise: item.lineTotalPaise,
  }));

  return {
    id: order.id,
    status: order.status,
    notes: order.notes ?? null,
    guestEmail: order.guestEmail ?? null,
    billingAddress: toRecord(order.billingAddress),
    shippingAddress: toRecord(order.shippingAddress),
    totals: {
      subtotalPaise: order.subtotalPaise,
      taxPaise: order.taxPaise,
      shippingPaise: order.shippingPaise,
      discountPaise: order.discountPaise,
      totalPaise: order.totalPaise,
    },
    items,
  };
}

export async function buyNowCheckout(
  context: CheckoutContext,
  input: BuyNowInput
): Promise<CheckoutResponseDto> {
  const { item, contact, shippingAddress, billingAddress, notes } = input;

  const isGuest = !context.userId;
  const contactEmail = contact?.email;
  if (isGuest && !contactEmail) {
    throw createHttpError(400, "Contact email is required for guest checkout");
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: item.variantId },
    include: {
      product: true,
      inventory: true,
    },
  });

  if (!variant || !variant.isActive || !variant.product.isActive) {
    throw createHttpError(404, "Variant not found or inactive");
  }

  if (!variant.inventory) {
    throw createHttpError(400, "Inventory unavailable for variant");
  }

  if (variant.inventory.stock < item.quantity) {
    throw createHttpError(400, "Insufficient stock for item");
  }

  const unitPrice = variant.salePaise ?? variant.mrpPaise;
  if (unitPrice == null) {
    throw createHttpError(400, "Pricing unavailable for item");
  }

  const subtotal = unitPrice * item.quantity;
  const taxPaise = 0;
  const shippingPaise = 0;
  const discountPaise = 0;
  const totalPaise = subtotal + taxPaise + shippingPaise - discountPaise;

  const noteValue = notes?.trim() || null;

  const order = await prisma.$transaction(async (tx) => {
    await tx.inventory.update({
      where: { variantId: variant.id },
      data: {
        stock: {
          decrement: item.quantity,
        },
        reserved: {
          increment: item.quantity,
        },
      },
    });

    const created = await tx.order.create({
      data: {
        userId: context.userId ?? null,
        guestEmail: contactEmail,
        subtotalPaise: subtotal,
        taxPaise,
        shippingPaise,
        discountPaise,
        totalPaise,
        billingAddress: toJsonValue(billingAddress),
        shippingAddress: toJsonValue(shippingAddress),
        notes: noteValue,
        items: {
          create: {
            variantId: variant.id,
            productId: variant.productId,
            sizeMl: variant.sizeMl,
            unitPricePaise: unitPrice,
            quantity: item.quantity,
            lineTotalPaise: subtotal,
          },
        },
      },
      include: ORDER_INCLUDE,
    });

    return created as OrderWithRelations;
  });

  return {
    order: mapOrderToDto(order),
  };
}
