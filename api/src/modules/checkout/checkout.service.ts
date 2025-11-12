import type { Prisma } from "@prisma/client";

import { prisma } from "../../prisma";
import { createHttpError } from "../../middlewares/error";
import { env } from "../../env";
import { logger } from "../../logger";
import { recomputeLiveOfferForVariant } from "../offers/offers.service";
import type { CartContext } from "../cart/cart.service";
import { getCart } from "../cart/cart.service";
import {
  ORDER_EMAIL_INCLUDE,
  buildFullName,
  sendOrderConfirmationEmail,
} from "../orders/order.emails";
import type { CheckoutInput, BuyNowInput } from "./checkout.schemas";
import type { CheckoutOrderDto, CheckoutOrderItemDto, CheckoutResponseDto } from "./checkout.dto";

export type CheckoutContext = CartContext;

const ORDER_INCLUDE = ORDER_EMAIL_INCLUDE;

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function fetchCheckoutUser(context: CheckoutContext) {
  if (!context.userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: context.userId },
    select: {
      email: true,
      fullName: true,
    },
  });

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  return user;
}

export async function submitCheckout(
  context: CheckoutContext,
  input: CheckoutInput
): Promise<CheckoutResponseDto> {
  const isGuest = !context.userId;

  const checkoutUser = await fetchCheckoutUser(context);

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

  const normalizeAmount = (value: number | undefined | null) =>
    Number.isFinite(value) ? Math.max(0, Math.round(value as number)) : 0;

  const shippingPaiseInput = normalizeAmount(input.pricing?.shippingPaise);
  const taxPaiseInput = normalizeAmount(input.pricing?.taxPaise);
  const discountPaiseInput = normalizeAmount(input.pricing?.discountPaise);

  const result = await prisma.$transaction(async (tx) => {
    const cartRecord = await tx.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                liveOffer: {
                  include: {
                    offer: true,
                  },
                },
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
    const taxPaise = taxPaiseInput;
    const shippingPaise = shippingPaiseInput;
    const discountPaise = discountPaiseInput;

    const offerReductions: Array<{
      variantId: string;
      offerId: string;
      quantity: number;
    }> = [];

    const orderItemsData = cartRecord.items.map((item) => {
      const variant = item.variant;
      const product = variant.product;
      if (!variant.isActive || !product.isActive) {
        throw createHttpError(400, "Cart contains inactive product");
      }

      const liveOffer = variant.liveOffer;
      const offer = liveOffer?.offer;
      if (!liveOffer || !offer || !offer.isActive) {
        throw createHttpError(400, "Variant unavailable for purchase");
      }

      if (offer.stockQty < item.quantity) {
        throw createHttpError(400, "Insufficient stock for item");
      }

      const unitPrice = liveOffer.price ?? variant.salePaise ?? variant.mrpPaise;
      if (unitPrice == null) {
        throw createHttpError(400, "Pricing unavailable for item");
      }
      const quantity = item.quantity;
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      offerReductions.push({
        variantId: variant.id,
        offerId: offer.id,
        quantity,
      });

      return {
        variantId: variant.id,
        productId: product.id,
        sizeMl: variant.sizeMl,
        unitPricePaise: unitPrice,
        quantity,
        lineTotalPaise: lineTotal,
        sellerId: liveOffer.sellerId,
        sellerLocationId: liveOffer.sellerLocationId,
        sellerOfferId: liveOffer.offerId,
      };
    });

    const totalPaise = subtotal + taxPaise + shippingPaise - discountPaise;

    for (const reduction of offerReductions) {
      const result = await tx.masterOffer.updateMany({
        where: {
          id: reduction.offerId,
          stockQty: {
            gte: reduction.quantity,
          },
        },
        data: {
          stockQty: {
            decrement: reduction.quantity,
          },
        },
      });

      if (result.count === 0) {
        throw createHttpError(400, "Insufficient stock for item");
      }

      await recomputeLiveOfferForVariant(reduction.variantId, tx);
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

  const recipientEmail = contactEmail ?? checkoutUser?.email ?? result.guestEmail ?? null;
  const shippingName = buildFullName(input.shippingAddress.firstName, input.shippingAddress.lastName);
  const billingName = buildFullName(input.billingAddress.firstName, input.billingAddress.lastName);
  const fallbackName =
    checkoutUser?.fullName ??
    (recipientEmail ? recipientEmail.split("@")[0] ?? recipientEmail : "there");
  const customerName = shippingName ?? billingName ?? fallbackName;

  const paymentMode = input.paymentMode ?? "PREPAID";
  const shouldSendNow = paymentMode === "COD" || result.totalPaise <= 0;

  if (recipientEmail && shouldSendNow) {
    const paymentStatusLabel =
      paymentMode === "COD" ? "Cash on Delivery – payment pending" : "No payment required";
    const paymentStatusNote =
      paymentMode === "COD"
        ? "You chose Cash on Delivery. Please pay the courier when the order arrives."
        : "This order does not require an online payment.";
    try {
      await sendOrderConfirmationEmail(result, {
        recipientEmail,
        customerName,
        supportEmail: env.emailFrom,
        paymentStatusLabel,
        paymentStatusNote,
      });
    } catch (error) {
      logger.error("Failed to send order confirmation email", {
        error,
        orderId: result.id,
        recipientEmail,
      });
    }
  } else if (!recipientEmail) {
    logger.warn("Skipping order confirmation email due to missing recipient", {
      orderId: result.id,
    });
  } else {
    logger.info("Deferring order confirmation email until payment confirmation", {
      orderId: result.id,
    });
  }

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

  const checkoutUser = await fetchCheckoutUser(context);

  const isGuest = !context.userId;
  const contactEmail = contact?.email;
  if (isGuest && !contactEmail) {
    throw createHttpError(400, "Contact email is required for guest checkout");
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: item.variantId },
    include: {
      product: true,
      liveOffer: {
        include: {
          offer: true,
        },
      },
    },
  });

  if (!variant || !variant.isActive || !variant.product.isActive) {
    throw createHttpError(404, "Variant not found or inactive");
  }

  const liveOffer = variant.liveOffer;
  const offer = liveOffer?.offer;
  if (!liveOffer || !offer || !offer.isActive) {
    throw createHttpError(400, "Variant unavailable for purchase");
  }

  if (offer.stockQty < item.quantity) {
    throw createHttpError(400, "Insufficient stock for item");
  }

  const unitPrice = liveOffer.price ?? variant.salePaise ?? variant.mrpPaise;
  if (unitPrice == null) {
    throw createHttpError(400, "Pricing unavailable for item");
  }

  const subtotal = unitPrice * item.quantity;
  const normalizeAmount = (value: number | undefined | null) =>
    Number.isFinite(value) ? Math.max(0, Math.round(value as number)) : 0;

  const taxPaise = normalizeAmount(input.pricing?.taxPaise);
  const shippingPaise = normalizeAmount(input.pricing?.shippingPaise);
  const discountPaise = normalizeAmount(input.pricing?.discountPaise);
  const totalPaise = subtotal + taxPaise + shippingPaise - discountPaise;

  const noteValue = notes?.trim() || null;

  const order = await prisma.$transaction(async (tx) => {
    const result = await tx.masterOffer.updateMany({
      where: {
        id: offer.id,
        stockQty: {
          gte: item.quantity,
        },
      },
      data: {
        stockQty: {
          decrement: item.quantity,
        },
      },
    });

    if (result.count === 0) {
      throw createHttpError(400, "Insufficient stock for item");
    }

    await recomputeLiveOfferForVariant(variant.id, tx);

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
            sellerId: liveOffer.sellerId,
            sellerLocationId: liveOffer.sellerLocationId,
            sellerOfferId: liveOffer.offerId,
          },
        },
      },
      include: ORDER_INCLUDE,
    });

    return created as OrderWithRelations;
  });

  const recipientEmail = contactEmail ?? checkoutUser?.email ?? order.guestEmail ?? null;
  const shippingName = buildFullName(shippingAddress.firstName, shippingAddress.lastName);
  const billingName = buildFullName(billingAddress.firstName, billingAddress.lastName);
  const fallbackName =
    checkoutUser?.fullName ??
    (recipientEmail ? recipientEmail.split("@")[0] ?? recipientEmail : "there");
  const customerName = shippingName ?? billingName ?? fallbackName;

  const paymentMode = input.paymentMode ?? "PREPAID";
  const shouldSendNow = paymentMode === "COD" || order.totalPaise <= 0;

  if (recipientEmail && shouldSendNow) {
    const paymentStatusLabel =
      paymentMode === "COD" ? "Cash on Delivery – payment pending" : "No payment required";
    const paymentStatusNote =
      paymentMode === "COD"
        ? "You chose Cash on Delivery. Please pay the courier when the order arrives."
        : "This order does not require an online payment.";
    try {
      await sendOrderConfirmationEmail(order, {
        recipientEmail,
        customerName,
        supportEmail: env.emailFrom,
        paymentStatusLabel,
        paymentStatusNote,
      });
    } catch (error) {
      logger.error("Failed to send order confirmation email", {
        error,
        orderId: order.id,
        recipientEmail,
      });
    }
  } else if (!recipientEmail) {
    logger.warn("Skipping order confirmation email due to missing recipient", {
      orderId: order.id,
    });
  } else {
    logger.info("Deferring order confirmation email until payment confirmation", {
      orderId: order.id,
    });
  }

  return {
    order: mapOrderToDto(order),
  };
}
