import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";

import { env } from "../../env";
import { createHttpError } from "../../middlewares/error";
import { prisma } from "../../prisma";
import { createRazorpayOrder, fetchRazorpayPayment, verifyPaymentSignature } from "./razorpay";
import type { PaymentConfirmationDto, PaymentSessionDto } from "./payments.dto";

export type PaymentContext = {
  userId?: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  guestEmail?: string | null;
};

type OrderWithPayment = Prisma.OrderGetPayload<{
  include: {
    payment: true;
    user: true;
  };
}>;

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function buildEventId(prefix: string, reference: string): string {
  const random = Math.random().toString(16).slice(2, 10);
  return `${prefix}:${reference}:${Date.now()}:${random}`;
}

function mapRazorpayStatus(status: string): PaymentStatus {
  switch (status) {
    case "captured":
      return "completed";
    case "failed":
      return "failed";
    case "refunded":
      return "refunded";
    case "partial_refunded":
    case "partially_refunded":
      return "partial_refund";
    default:
      return "pending";
  }
}

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.trim().toLowerCase();
}

function assertOrderAccess(order: OrderWithPayment, context: PaymentContext) {
  if (order.userId) {
    if (order.userId !== context.userId) {
      throw createHttpError(403, "You do not have access to this order");
    }
    return;
  }

  const guestEmail = normalizeEmail(context.guestEmail ?? context.email ?? null);
  const orderGuestEmail = normalizeEmail(order.guestEmail ?? null);

  if (!guestEmail) {
    throw createHttpError(401, "Guest email is required to access this order");
  }

  if (!orderGuestEmail || guestEmail !== orderGuestEmail) {
    throw createHttpError(403, "Guest email does not match this order");
  }
}

export async function createPaymentSession(
  orderId: string,
  context: PaymentContext
): Promise<PaymentSessionDto> {
  const { order, payment } = await prisma.$transaction(async (tx) => {
    const orderRecord = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        user: true,
      },
    });

    if (!orderRecord) {
      throw createHttpError(404, "Order not found");
    }

    assertOrderAccess(orderRecord, context);

    if (orderRecord.totalPaise <= 0) {
      throw createHttpError(400, "Order total must be greater than zero to initiate payment");
    }

    let paymentRecord = orderRecord.payment;

    if (paymentRecord) {
      if (paymentRecord.status === "completed") {
        throw createHttpError(400, "Order already has a completed payment");
      }
      if (paymentRecord.amountPaise !== orderRecord.totalPaise) {
        paymentRecord = await tx.payment.update({
          where: { id: paymentRecord.id },
          data: {
            amountPaise: orderRecord.totalPaise,
          },
        });
      }
    } else {
      paymentRecord = await tx.payment.create({
        data: {
          userId: orderRecord.userId ?? null,
          provider: "Razorpay",
          amountPaise: orderRecord.totalPaise,
          status: "pending",
        },
      });

      await tx.order.update({
        where: { id: orderRecord.id },
        data: {
          paymentId: paymentRecord.id,
        },
      });
    }

    return { order: orderRecord, payment: paymentRecord };
  });

  let providerOrderId = payment.providerOrderId;

  if (!providerOrderId) {
    const notes: Record<string, string> = {
      swcOrderId: order.id,
    };
    if (order.userId) {
      notes.swcUserId = order.userId;
    } else if (order.guestEmail) {
      notes.guestEmail = order.guestEmail;
    }

    const razorpayOrder = await createRazorpayOrder({
      amount: payment.amountPaise,
      currency: "INR",
      receipt: order.id,
      notes,
    });

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerOrderId: razorpayOrder.id,
        events: {
          create: {
            provider: "Razorpay",
            eventId: buildEventId("razorpay.order", razorpayOrder.id),
            eventType: "order.created",
            payload: toJson(razorpayOrder),
          },
        },
      },
    });

    providerOrderId = updatedPayment.providerOrderId ?? razorpayOrder.id;
  }

  const customerEmail =
    context.email ??
    context.guestEmail ??
    order.user?.email ??
    order.guestEmail ??
    null;

  const customer = {
    name: context.name ?? order.user?.fullName ?? null,
    email: customerEmail,
    contact: context.phone ?? order.user?.phone ?? null,
  };

  return {
    orderId: order.id,
    amountPaise: payment.amountPaise,
    currency: "INR",
    razorpayOrderId: providerOrderId,
    razorpayKeyId: env.razorpayKeyId,
    receipt: order.id,
    customer,
  };
}

export async function confirmRazorpayPayment(
  orderId: string,
  context: PaymentContext,
  input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }
): Promise<PaymentConfirmationDto> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payment: true,
      user: true,
    },
  });

  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  assertOrderAccess(order as OrderWithPayment, context);

  const payment = order.payment;

  if (!payment) {
    throw createHttpError(400, "No payment session found for this order");
  }

  if (payment.providerOrderId !== input.razorpayOrderId) {
    throw createHttpError(400, "Razorpay order reference mismatch");
  }

  if (
    payment.status === "completed" &&
    payment.providerPaymentId === input.razorpayPaymentId
  ) {
    return {
      orderId: order.id,
      paymentId: payment.providerPaymentId,
      status: payment.status,
      method: payment.method ?? null,
      amountPaise: payment.amountPaise,
      orderStatus: order.status,
    };
  }

  const signatureValid = verifyPaymentSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });

  if (!signatureValid) {
    throw createHttpError(400, "Invalid payment signature");
  }

  const razorpayPayment = await fetchRazorpayPayment(input.razorpayPaymentId);

  if (razorpayPayment.order_id !== input.razorpayOrderId) {
    throw createHttpError(400, "Payment does not belong to the expected Razorpay order");
  }

  if (razorpayPayment.amount !== payment.amountPaise) {
    throw createHttpError(400, "Payment amount does not match the order total");
  }

  const paymentStatus = mapRazorpayStatus(razorpayPayment.status);
  const transactionTs = new Date(razorpayPayment.created_at * 1000);
  const nextOrderStatus: OrderStatus | null =
    paymentStatus === "completed" ? "paid" : null;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: razorpayPayment.id,
        status: paymentStatus,
        method: razorpayPayment.method || null,
        amountPaise: razorpayPayment.amount,
        transactionTs,
        events: {
          create: {
            provider: "Razorpay",
            eventId: buildEventId("razorpay.payment", razorpayPayment.id),
            eventType: `payment.${razorpayPayment.status}`,
            payload: toJson(razorpayPayment),
          },
        },
      },
    });

    if (nextOrderStatus && order.status !== nextOrderStatus) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: nextOrderStatus,
        },
      });
    }
  });

  return {
    orderId: order.id,
    paymentId: razorpayPayment.id,
    status: paymentStatus,
    method: razorpayPayment.method || null,
    amountPaise: razorpayPayment.amount,
    orderStatus: nextOrderStatus ?? order.status,
  };
}
