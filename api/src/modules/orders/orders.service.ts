import type { OrderStatus, Prisma } from "@prisma/client";

import { prisma } from "../../prisma";
import { createHttpError } from "../../middlewares/error";
import type {
  OrderDetailDto,
  OrderDetailResponse,
  OrderItemDto,
  OrderListResponse,
  OrderSummaryDto,
  ShipmentSummaryDto,
} from "./orders.dto";

const ORDER_INCLUDE = {
  items: {
    include: {
      variant: {
        include: {
          product: true,
          inventory: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  },
  shipments: true,
  payment: true,
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;

const CANCELLABLE_STATUSES: OrderStatus[] = ["pending", "paid", "processing"];

type OrderContext = {
  userId?: string;
  guestEmail?: string;
};

function toRecord(value: Prisma.JsonValue): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function mapOrderItems(order: OrderWithRelations): OrderItemDto[] {
  return order.items.map((item) => ({
    id: item.id,
    variantId: item.variantId,
    productId: item.productId,
    title: item.variant.product.title,
    sizeMl: item.sizeMl,
    quantity: item.quantity,
    unitPricePaise: item.unitPricePaise,
    lineTotalPaise: item.lineTotalPaise,
  }));
}

function mapShipments(order: OrderWithRelations): ShipmentSummaryDto[] {
  return order.shipments.map((shipment) => ({
    id: shipment.id,
    trackingNumber: shipment.trackingNumber,
    status: shipment.status,
  }));
}

function mapOrderDetail(order: OrderWithRelations): OrderDetailDto {
  const items = mapOrderItems(order);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    notes: order.notes ?? null,
    guestEmail: order.guestEmail ?? null,
    billingAddress: toRecord(order.billingAddress),
    shippingAddress: toRecord(order.shippingAddress),
    subtotalPaise: order.subtotalPaise,
    taxPaise: order.taxPaise,
    shippingPaise: order.shippingPaise,
    discountPaise: order.discountPaise,
    totalPaise: order.totalPaise,
    items,
    shipments: mapShipments(order),
    paymentStatus: order.payment?.status ?? null,
    itemCount,
  };
}

function mapOrderSummary(order: OrderWithRelations): OrderSummaryDto {
  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);
  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    totalPaise: order.totalPaise,
    itemCount,
  };
}

export async function listOrdersForUser(
  userId: string,
  options: { cursor?: string; limit?: number } = {}
): Promise<OrderListResponse> {
  const take = Math.min(Math.max(options.limit ?? 20, 1), 50);

  const orders = await prisma.order.findMany({
    where: { userId },
    include: ORDER_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(options.cursor
      ? {
          skip: 1,
          cursor: { id: options.cursor },
        }
      : {}),
  });

  const hasMore = orders.length > take;
  const slice = hasMore ? orders.slice(0, take) : orders;

  return {
    data: slice.map(mapOrderSummary),
    meta: {
      nextCursor: hasMore ? slice[slice.length - 1]?.id ?? null : null,
    },
  };
}

export async function getOrderByContext(
  orderId: string,
  context: OrderContext
): Promise<OrderDetailResponse> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: ORDER_INCLUDE,
  });

  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  if (context.userId) {
    if (order.userId !== context.userId) {
      throw createHttpError(404, "Order not found");
    }
  } else if (context.guestEmail) {
    if ((order.guestEmail ?? "").toLowerCase() !== context.guestEmail.toLowerCase()) {
      throw createHttpError(404, "Order not found");
    }
  } else {
    throw createHttpError(401, "Authentication required");
  }

  return { data: mapOrderDetail(order) };
}

export async function cancelOrder(
  orderId: string,
  context: OrderContext
): Promise<OrderDetailResponse> {
  if (!context.userId) {
    throw createHttpError(401, "Authentication required");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: ORDER_INCLUDE,
  });

  if (!order || order.userId !== context.userId) {
    throw createHttpError(404, "Order not found");
  }

  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    throw createHttpError(400, "Order cannot be cancelled at this stage");
  }

  if (order.shipments.length > 0) {
    throw createHttpError(400, "Order already prepared for shipment");
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      const inventory = item.variant.inventory;
      if (!inventory) {
        continue;
      }

      const reservedDecrease = Math.min(inventory.reserved, item.quantity);

      await tx.inventory.update({
        where: { variantId: item.variantId },
        data: {
          stock: {
            increment: item.quantity,
          },
          reserved: {
            decrement: reservedDecrease,
          },
        },
      });
    }

    const orderUpdate = await tx.order.update({
      where: { id: orderId },
      data: {
        status: "cancelled",
      },
      include: ORDER_INCLUDE,
    });

    if (orderUpdate.paymentId) {
      await tx.payment.update({
        where: { id: orderUpdate.paymentId },
        data: {
          status: "refunded",
        },
      });
    }

    return orderUpdate as OrderWithRelations;
  });

  return { data: mapOrderDetail(updated) };
}
