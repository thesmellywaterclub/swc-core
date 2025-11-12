import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";

import { env } from "../../env";
import { createHttpError } from "../../middlewares/error";
import { prisma } from "../../prisma";
import { logger } from "../../logger";
import { createRazorpayOrder, fetchRazorpayPayment, verifyPaymentSignature } from "./razorpay";
import {
  ORDER_EMAIL_INCLUDE,
  buildFullName,
  sendOrderConfirmationEmail,
} from "../orders/order.emails";
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

function getAddressRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function extractAddressName(address: Prisma.JsonValue | null): {
  firstName: string | null;
  lastName: string | null;
} {
  const record = getAddressRecord(address);
  const firstName =
    record && typeof record.firstName === "string" ? (record.firstName as string) : null;
  const lastName =
    record && typeof record.lastName === "string" ? (record.lastName as string) : null;
  return { firstName, lastName };
}

function toGatewayAmountPaise(amountInRupees: number): number {
  if (!Number.isFinite(amountInRupees)) {
    return 0;
  }
  return Math.round(Math.max(0, amountInRupees) * 100);
}

function mapRazorpayStatus(status: string): PaymentStatus {
  switch (status) {
    case "captured":
      return "completed";
    case "failed":
      return "failed";
    case "refunded":
      return "refunded";
    case "partially_refunded":
      return "partial_refund";
    default:
      return "pending";
  }
}

function describePaymentStatus(status: PaymentStatus): {
  label: string;
  note: string;
} {
  switch (status) {
    case "completed":
      return {
        label: "Paid via Razorpay",
        note: "We have received your payment via Razorpay.",
      };
    case "failed":
      return {
        label: "Payment failed",
        note: "Your Razorpay payment failed. Please retry to keep your order active.",
      };
    case "refunded":
      return {
        label: "Payment refunded",
        note: "Your Razorpay payment has been refunded.",
      };
    case "partial_refund":
      return {
        label: "Payment partially refunded",
        note: "A partial refund has been issued for this Razorpay payment.",
      };
    default:
      return {
        label: "Payment pending",
        note: "We are waiting for Razorpay to confirm your payment.",
      };
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
  const gatewayAmountPaise = toGatewayAmountPaise(payment.amountPaise);

  if (gatewayAmountPaise < 100) {
    throw createHttpError(400, "Online payments require a minimum order total of ₹1");
  }

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
      amount: gatewayAmountPaise,
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
    amountPaise: gatewayAmountPaise,
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

  const expectedGatewayAmount = toGatewayAmountPaise(payment.amountPaise);

  if (razorpayPayment.amount !== expectedGatewayAmount) {
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

  const orderEmailRecord = await prisma.order.findUnique({
    where: { id: order.id },
    include: ORDER_EMAIL_INCLUDE,
  });

  const recipientEmail =
    order.guestEmail ??
    order.user?.email ??
    context.email ??
    context.guestEmail ??
    null;

  if (orderEmailRecord && recipientEmail) {
    const shippingNameParts = extractAddressName(order.shippingAddress);
    const billingNameParts = extractAddressName(order.billingAddress);
    const fallbackName =
      order.user?.fullName ??
      (recipientEmail ? recipientEmail.split("@")[0] ?? recipientEmail : "there");
    const customerName =
      buildFullName(shippingNameParts.firstName, shippingNameParts.lastName) ??
      buildFullName(billingNameParts.firstName, billingNameParts.lastName) ??
      fallbackName;
    const { label, note } = describePaymentStatus(paymentStatus);
    try {
      await sendOrderConfirmationEmail(orderEmailRecord, {
        recipientEmail,
        customerName,
        supportEmail: env.emailFrom,
        paymentStatusLabel: label,
        paymentStatusNote: note,
        orderStatus: nextOrderStatus ?? order.status,
      });
    } catch (error) {
      logger.error("Failed to send payment status email", {
        error,
        orderId: order.id,
        recipientEmail,
      });
    }
  } else if (!recipientEmail) {
    logger.warn("Skipping payment status email due to missing recipient", {
      orderId: order.id,
    });
  }

  return {
    orderId: order.id,
    paymentId: razorpayPayment.id,
    status: paymentStatus,
    method: razorpayPayment.method || null,
    amountPaise: razorpayPayment.amount,
    orderStatus: nextOrderStatus ?? order.status,
  };
}
